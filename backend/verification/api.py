"""The public chat endpoint the widget talks to.

Anonymous by design: nobody has to sign in to ask whether something is true.
The visitor is known by their own browser session, and abuse is met with a
per-visitor rate limit that the dashboard can tune, not with a login wall.
"""

from __future__ import annotations

import base64
import uuid

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from django.conf import settings
from django.http import FileResponse, Http404

from appsettings.models import AppSetting
from knowledge.models import Document
from ai.phrases import phrase
from ai.speech import SPEECH_FORMATS, speak, transcribe
from verification.engine import Reply, handle_message
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


def _open_conversation(request: Request) -> tuple[Conversation, str | None]:
    """The conversation this browser is continuing, or a fresh one.

    Also returns the visitor key to issue when the browser arrived without a
    valid one, so the response can set the cookie; None when it already had it.
    """
    if not request.session.session_key:
        request.session.save()
    session_key = request.session.session_key

    visitor_key = request.COOKIES.get(VISITOR_COOKIE) or ""
    issued_key = None
    if not _looks_like_visitor_key(visitor_key):
        visitor_key = uuid.uuid4().hex
        issued_key = visitor_key

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
    return conversation, issued_key


def _remember_language(conversation: Conversation, request: Request) -> None:
    """The language the widget is showing, kept on the conversation.

    Sent with every message, since the visitor can switch mid-conversation
    and Ma'at should follow them. Only a short code is accepted; anything
    else leaves the conversation as it was.
    """
    code = (request.data.get("language") or "").strip().lower()[:12]
    if code and code.replace("-", "").isalpha() and code != conversation.language:
        conversation.language = code
        conversation.save(update_fields=["language"])


def _respond(request: Request, conversation: Conversation, body: dict, issued_key: str | None) -> Response:
    """The reply, with the visitor cookie set when this browser was just given one."""
    response = Response({"conversation": str(conversation.id), **body})
    if issued_key:
        response.set_cookie(
            VISITOR_COOKIE,
            issued_key,
            max_age=VISITOR_COOKIE_MAX_AGE,
            httponly=True,
            samesite="Lax",
            secure=request.is_secure(),
        )
    return response


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

        conversation, issued_key = _open_conversation(request)
        _remember_language(conversation, request)
        reply = handle_message(conversation, text)
        return _respond(request, conversation, {"reply": reply.as_dict()}, issued_key)


class VoiceChatView(ChatView):
    """POST multipart {audio, conversation?, language?} -> the words heard, a reply, and the reply read aloud.

    The same conversation, the same rate limit and the same road through the
    engine as typed text. Only the first and last steps differ: the note is
    transcribed on the way in, and the reply is spoken on the way out. The
    audio is read once here and never written anywhere.
    """

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        upload = request.FILES.get("audio")
        if upload is None:
            return Response({"detail": "Send a voice note."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > settings.VOICE_NOTE_MAX_BYTES:
            return Response({"detail": "That voice note is longer than I can listen to at once."}, status=status.HTTP_400_BAD_REQUEST)
        language = (request.data.get("language") or "").strip()[:8]

        heard = transcribe(upload.read(), upload.name, language=language)
        if heard is None:
            # Nothing to weigh, so nothing is recorded: no conversation is
            # opened for a note that carried no words.
            reply = Reply(kind="text", text=phrase("could_not_listen", language), degraded=True)
            return Response({
                "conversation": request.data.get("conversation") or None,
                "transcript": "",
                "reply": reply.as_dict(),
                "audio": None,
            })

        conversation, issued_key = _open_conversation(request)
        _remember_language(conversation, request)
        reply = handle_message(conversation, heard.text[:MAX_MESSAGE_CHARS])
        spoken = speak(reply.text, language=conversation.language)
        payload = {
            "transcript": heard.text,
            "reply": reply.as_dict(),
            "audio": (
                {"content_type": SPEECH_FORMATS["mp3"], "base64": base64.b64encode(spoken).decode("ascii")}
                if spoken
                else None
            ),
        }
        return _respond(request, conversation, payload, issued_key)


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
