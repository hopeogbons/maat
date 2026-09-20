"""One Telegram update, answered the way the widget would be.

A chat is a Conversation keyed by its chat id, so a person on Telegram gets
the same interview, the same weighing and the same verdict as a visitor on
the page. A voice note is transcribed on the way in and the reply is spoken
on the way out, in Opus, which is what Telegram plays as a voice message.
The yes-or-no answers a reply offers become buttons under it.

    update -> handle_update() -> handle_message() -> sendMessage [+ sendVoice]

Nothing about the person is kept beyond what the widget keeps: the chat id
stands where the browser's cookie stood.
"""

from __future__ import annotations

import hashlib
import logging

from django.conf import settings
from django.utils import timezone

from ai.phrases import phrase
from ai.prompts import LANGUAGE_NAMES
from ai.speech import speak, transcribe
from telegram import client
from telegram.models import TelegramBot
from verification.api import MAX_MESSAGE_CHARS
from verification.engine import Reply, handle_message
from verification.models import Conversation

logger = logging.getLogger(__name__)


def _language_for(code: str | None) -> str:
    """The widget language nearest to Telegram's IETF tag, else English."""
    primary = (code or "").lower().split("-")[0]
    return primary if primary in LANGUAGE_NAMES else "en"


def _conversation_for(chat_id: int, language: str) -> Conversation:
    key = f"telegram:{chat_id}"
    conversation = Conversation.active.filter(session_key=key, is_closed=False).order_by("-last_active_at").first()
    if conversation is None:
        visitor = hashlib.sha256(key.encode()).hexdigest()[:32]
        conversation = Conversation.objects.create(session_key=key, visitor_key=visitor, language=language)
    elif conversation.language != language:
        conversation.language = language
        conversation.save(update_fields=["language"])
    return conversation


def render(reply: Reply, language: str) -> str:
    """The reply as one Telegram message: verdict, answer, then the sources."""
    parts: list[str] = []
    if reply.kind == "verdict" and reply.verdict:
        parts.append(phrase(f"verdict_{reply.verdict}", language))
    parts.append(reply.text)
    for source in reply.sources[:3]:
        label = phrase("closest_record" if source.get("judgement") == "settles_nothing" else "cited_source", language)
        line = f"{label}: {source.get('issuer') or ''}"
        if source.get("date"):
            line += f", {source['date']}"
        if source.get("title"):
            line += f"\n{source['title']}"
        if source.get("translation"):
            line += f"\n“{source['translation']}”"
        elif source.get("quote") and source.get("highlight"):
            start, end = source["highlight"]
            line += f"\n“{source['quote'][start:end]}”"
        if source.get("url"):
            line += f"\n{source['url']}"
        parts.append(line)
    base = settings.PUBLIC_API_URL
    for attachment in reply.attachments:
        url = attachment.get("url") or ""
        parts.append(f"{attachment.get('title') or ''}\n{base + url if base and url.startswith('/') else url}")
    return "\n\n".join(part for part in parts if part)


def _choices_for(reply: Reply, language: str) -> list[dict]:
    labels = {"yes": phrase("yes", language), "no": phrase("no", language)}
    return [{"label": labels.get(c["kind"], c["send"]), "send": c["send"]} for c in reply.choices]


def handle_update(bot: TelegramBot, update: dict) -> None:
    """Answer one update. Every failure is logged and swallowed: Telegram must not retry it."""
    try:
        _handle(bot, update)
    except Exception:  # noqa: BLE001 - a failed turn is a logged turn, never a retried one
        logger.exception("telegram update failed")


def _handle(bot: TelegramBot, update: dict) -> None:
    token = bot.token
    spoken = False
    if "callback_query" in update:
        query = update["callback_query"]
        client.answer_callback(token, str(query.get("id", "")))
        message = query.get("message") or {}
        chat_id = (message.get("chat") or {}).get("id")
        text = (query.get("data") or "").strip()
        language = _language_for((query.get("from") or {}).get("language_code"))
    elif "message" in update:
        message = update["message"]
        chat_id = (message.get("chat") or {}).get("id")
        language = _language_for((message.get("from") or {}).get("language_code"))
        media = message.get("voice") or message.get("audio")
        if media:
            spoken = True
            client.send_chat_action(token, chat_id, "typing")
            audio, name = client.download_file(token, media["file_id"])
            if len(audio) > settings.VOICE_NOTE_MAX_BYTES:
                client.send_message(token, chat_id, phrase("could_not_listen", language))
                return
            heard = transcribe(audio, name, language=language)
            if heard is None:
                client.send_message(token, chat_id, phrase("could_not_listen", language))
                return
            text = heard.text[:MAX_MESSAGE_CHARS]
        else:
            text = (message.get("text") or "").strip()
    else:
        return
    if chat_id is None or not text:
        return

    if text.startswith("/start") or text.startswith("/help"):
        client.send_message(token, chat_id, phrase("greeting", language))
        return
    if text.startswith("/"):
        return

    conversation = _conversation_for(chat_id, language)
    client.send_chat_action(token, chat_id, "record_voice" if spoken else "typing")
    reply = handle_message(conversation, text[:MAX_MESSAGE_CHARS])

    client.send_message(token, chat_id, render(reply, language), choices=_choices_for(reply, language))
    if spoken:
        voice = speak(reply.text, language=language, format="opus")
        if voice:
            client.send_voice(token, chat_id, voice)

    TelegramBot.objects.filter(pk=bot.pk).update(messages=bot.messages + 1, last_update_at=timezone.now())
