"""Who is acting, available to model code that has no request in hand.

`BaseModel.save` stamps created_by and updated_by. It is called from views, from
Celery tasks and from management commands alike, so the user cannot be passed
down as an argument without threading it through every layer. A context variable
set per request keeps that plumbing out of the models.

A context variable rather than thread-local storage: async views and tasks each
get their own copy, so one request can never see another's user.

NULL means the system did it: a scheduled poll, a seed command, a shell.
"""

from __future__ import annotations

import contextvars
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

_current_user: contextvars.ContextVar = contextvars.ContextVar("maat_current_user", default=None)


def get_current_user():
    """The signed-in user for this request or task, or None for the system."""
    return _current_user.get()


def set_current_user(user):
    """Set the acting user. Returns the token needed to restore the previous one."""
    return _current_user.set(user)


def reset_current_user(token) -> None:
    _current_user.reset(token)


class CurrentUserMiddleware:
    """Publishes request.user for the duration of the request.

    Placed after AuthenticationMiddleware, which is what puts request.user there
    in the first place. Anonymous users are stored as None so the audit columns
    read "system" rather than pointing at nobody.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        user = getattr(request, "user", None)
        token = set_current_user(user if user is not None and user.is_authenticated else None)
        try:
            return self.get_response(request)
        finally:
            reset_current_user(token)
