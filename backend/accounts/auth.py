"""Bearer-token authentication for the dashboard.

The staff dashboard is served from Vercel and this API from the VPS, on a
different domain. Those are different *sites*, so a Django session cookie
would have to be sent with `SameSite=None` to travel between them, and Safari
blocks third-party cookies by default whatever that attribute says — so
cookie sign-in simply does not work there, and the other browsers are moving
the same way. A token in an `Authorization` header is not a cookie, so none of
those rules reach it and every browser behaves the same.

What that costs: the token has to live somewhere JavaScript can read, which an
`HttpOnly` session cookie would have prevented. Successful XSS on the
dashboard therefore steals a working credential. Two things bound the damage —
the token expires (`API_TOKEN_TTL_HOURS`), and signing in again *replaces* the
previous token rather than adding a second one, so a stolen token stops
working as soon as the person signs in anywhere else.

CSRF does not apply to token auth: the browser attaches a cookie on its own,
which is what makes cross-site request forgery possible, but it never attaches
an `Authorization` header by itself. Session auth is still enabled as a second
class, so the Django admin and the browsable API keep working, and those paths
keep their CSRF protection.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token


def token_ttl() -> timedelta:
    """How long a token stays valid after it is issued."""
    return timedelta(hours=getattr(settings, "API_TOKEN_TTL_HOURS", 12))


def token_expires_at(token: Token) -> datetime:
    return token.created + token_ttl()


def issue_token(user) -> Token:
    """Give this person a fresh token, invalidating any they already had.

    Replacing rather than reusing is the whole point: DRF's `get_or_create`
    idiom hands back a token minted at the original sign-in, so its age — and
    therefore its expiry — would never move, and a token leaked once would
    keep working until that first one aged out.
    """
    Token.objects.filter(user=user).delete()
    return Token.objects.create(user=user)


def revoke_tokens(user) -> None:
    """Sign this person out everywhere. Called on logout."""
    if user is not None and user.is_authenticated:
        Token.objects.filter(user=user).delete()


class ExpiringTokenAuthentication(TokenAuthentication):
    """DRF's token authentication, with an age limit and a `Bearer` keyword.

    DRF's own `TokenAuthentication` never expires anything: a token issued
    once works until the row is deleted by hand. That is a poor fit for a
    credential sitting in browser storage, so the age is checked on every
    request and an expired token is deleted as it is rejected — the next
    request then fails at lookup instead of re-testing a row that can never
    pass again.
    """

    keyword = "Bearer"

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if timezone.now() >= token_expires_at(token):
            token.delete()
            raise exceptions.AuthenticationFailed("Your sign-in has expired. Sign in again.")
        return user, token
