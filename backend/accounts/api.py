"""Sign-in endpoints for the React front end.

The dashboard signs in with a bearer token, not a session cookie: it is served
from another site, and a cookie cannot be relied on to travel there at all.
`accounts/auth.py` has the full reasoning and the trade-off it carries.

A Django session is still opened alongside the token. That costs nothing and
means somebody who signs in here is also signed in to the admin on this domain,
which is how it behaved before tokens existed.
"""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.auth import issue_token, revoke_tokens, token_expires_at
from accounts.models import Profile


def name_from_username(username: str) -> str:
    """A name improvised from the sign-in name, for a profile with none set.

    The username is an email address here, so the part before the @ is what
    the person chose to be called: "hope.ogbons" reads as "Hope Ogbons". It
    is a stand-in until they fill the profile in, never a replacement for it.
    """
    local = username.split("@", 1)[0]
    words = [w for w in local.replace(".", " ").replace("_", " ").replace("-", " ").split() if w]
    return " ".join(w[:1].upper() + w[1:] for w in words) or username


def describe(user) -> dict:
    """The shape the front end stores for a signed-in person.

    The profile is the only place a name or a title comes from. Django's own
    first and last name columns are never consulted: the application owns the
    person's details, and a name typed into the admin would otherwise show up
    beside one typed into the profile with nothing to say which is right. When
    the profile is blank, both fields are improvised from the username.
    """
    if not user.is_authenticated:
        return {"authenticated": False}
    profile = getattr(user, "profile", None)
    username = user.get_username()
    return {
        "authenticated": True,
        "username": username,
        "name": (profile.full_name if profile else "") or name_from_username(username),
        "title": (profile.job_title if profile else "") or username,
        "avatarUrl": (profile.avatar_url if profile else "") or "",
        "isStaff": user.is_staff,
        "isSuperuser": user.is_superuser,
    }


class ProfileSerializer(serializers.ModelSerializer):
    """The fields a person may edit about themselves.

    Deliberately not here: anything that decides what they are allowed to do.
    Staff and superuser flags are set in the admin, never through the page a
    person edits their own details on.
    """

    class Meta:
        model = Profile
        fields = [
            "first_name",
            "last_name",
            "job_title",
            "phone",
            "avatar_url",
            "country",
            "timezone",
        ]

    def validate_phone(self, value: str) -> str:
        return value.strip()


class ProfileView(APIView):
    """The signed-in person's own details. Never anybody else's."""

    permission_classes = [IsAuthenticated]

    def get_object(self, request: Request) -> Profile:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile

    def get(self, request: Request) -> Response:
        profile = self.get_object(request)
        return Response(self._payload(request, profile))

    def patch(self, request: Request) -> Response:
        profile = self.get_object(request)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(self._payload(request, profile))

    def _payload(self, request: Request, profile: Profile) -> dict:
        return {
            **describe(request.user),
            "profile": ProfileSerializer(profile).data,
            "email": request.user.email,
        }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """Who is signed in, and the CSRF cookie needed to sign in or out."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        # Also returned in the body: when the front end is on another site the
        # cookie is not readable from JavaScript, but the header still must be sent.
        return Response({**describe(request.user), "csrfToken": get_token(request)})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request: Request) -> Response:
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        if not username or not password:
            return Response(
                {"detail": "Enter your username and password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            # Deliberately vague: never say which half was wrong.
            return Response(
                {"detail": "Those details do not match an account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        # A fresh token every time, which invalidates any the person was still
        # carrying elsewhere. `expiresAt` is returned so the dashboard can send
        # them back here before a request fails rather than after.
        token = issue_token(user)
        # Django rotates the CSRF token on login, and the front end may not be
        # able to read the cookie, so hand the new one back in the body. Token
        # auth does not use it; the admin on this domain does.
        return Response(
            {
                **describe(user),
                "token": token.key,
                "expiresAt": token_expires_at(token).isoformat(),
                "csrfToken": get_token(request),
            }
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        # Revoke before logout: `logout()` clears request.user, and an
        # un-revoked token would go on working long after the person believed
        # they had signed out.
        revoke_tokens(request.user)
        logout(request)
        return Response({"authenticated": False, "csrfToken": get_token(request)})
