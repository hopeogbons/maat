"""The public chat endpoint the widget talks to.

Anonymous by design: nobody has to sign in to ask whether something is true.
The visitor is known by their own browser session, and abuse is met with a
per-visitor rate limit that the dashboard can tune, not with a login wall.
"""

from __future__ import annotations

import uuid

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from django.http import FileResponse, Http404

from appsettings.models import AppSetting
from knowledge.models import Document
from verification.engine import handle_message
from verification.models import Conversation

MAX_MESSAGE_CHARS = 4000

#: The de-duplication cookie. Long-lived because a rumour collects mentions
#: over days, and separate from the session cookie because that one is cleared
#: far too readily to tell two reporters apart. It holds a random value and
#: nothing else: it answers "has this browser been here before", never "who is
#: this". See Conversation.visitor_key.
VISITOR_COOKIE = "maat_visitor"
VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365


class ChatThrottle(SimpleRateThrottle):
    """Questions per visitor per hour, read from the editable settings row."""

    scope = "chat"

    def get_rate(self):
        return f"{AppSetting.current().questions_per_visitor_per_hour}/hour"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def _looks_like_visitor_key(value: str) -> bool:
    """A key we minted, rather than whatever a client chose to send.

    The cookie is client-supplied and therefore untrusted. Without this a
    visitor could pin their key to a constant and count once however many
    browsers they opened, or worse, send a different one every request and
    publish a rumour single-handedly.
    """
    return len(value) == 32 and all(c in "0123456789abcdef" for c in value)


class ChatView(APIView):
    """POST {"text": "...", "conversation": "<id or null>"} -> a reply."""

    #: No authentication classes on purpose: a signed-in staff member using
    #: the widget is still just a visitor here, and a public endpoint must not
    #: demand a CSRF token from browsers that were never given one.
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [ChatThrottle]

    def post(self, request: Request) -> Response:
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Say something first."}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > MAX_MESSAGE_CHARS:
            return Response({"detail": "That is longer than I can read at once."}, status=status.HTTP_400_BAD_REQUEST)

        if not request.session.session_key:
            request.session.save()
        session_key = request.session.session_key

        visitor_key = request.COOKIES.get(VISITOR_COOKIE) or ""
        issued = False
        if not _looks_like_visitor_key(visitor_key):
            visitor_key = uuid.uuid4().hex
            issued = True

        conversation = None
        wanted = request.data.get("conversation")
        if wanted:
            conversation = Conversation.active.filter(id=wanted, session_key=session_key, is_closed=False).first()
        if conversation is None:
            conversation = Conversation.objects.create(session_key=session_key, visitor_key=visitor_key)
        elif conversation.visitor_key != visitor_key:
            # A conversation resumed after the cookie was reissued. Take the
            # current key so this thread counts under one reporter, not two.
            conversation.visitor_key = visitor_key
            conversation.save(update_fields=["visitor_key"])

        reply = handle_message(conversation, text)
        response = Response({"conversation": str(conversation.id), "reply": reply.as_dict()})
        if issued:
            response.set_cookie(
                VISITOR_COOKIE,
                visitor_key,
                max_age=VISITOR_COOKIE_MAX_AGE,
                httponly=True,
                samesite="Lax",
                secure=request.is_secure(),
            )
        return response


class DocumentDownloadView(APIView):
    """Hand a visitor the archived copy of a document marked shareable.

    Served through a view rather than from the media directory so the flag is
    what grants access. Published behind a static file server, every archived
    document would be one guessed path away from public, including the ones
    nobody cleared for release; here a document that is not marked shareable is
    simply not found, whatever its URL.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request: Request, pk) -> FileResponse:
        document = Document.active.filter(pk=pk, is_public=True).first()
        if document is None or not document.original:
            raise Http404
        return FileResponse(document.original.open("rb"), as_attachment=True, filename=_download_name(document))


def _download_name(document: Document) -> str:
    """The publisher's own filename, not our storage path."""
    name = (document.identifier or document.title or "document").split("/")[-1]
    return name[:120] or "document"
