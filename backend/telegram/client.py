"""The few Bot API calls Ma'at makes, and nothing else.

Each is one HTTPS request to Telegram, with the token in the path. Failures
raise TelegramError with Telegram's own description, so the dashboard can
show why a connection was refused.
"""

from __future__ import annotations

import requests
from django.conf import settings

TIMEOUT = 20.0


class TelegramError(RuntimeError):
    pass


def _base(token: str) -> str:
    return f"{settings.TELEGRAM_API_BASE}/bot{token}"


def _call(token: str, method: str, *, files: dict | None = None, **params) -> dict:
    try:
        if files:
            response = requests.post(f"{_base(token)}/{method}", data=params, files=files, timeout=TIMEOUT)
        else:
            response = requests.post(f"{_base(token)}/{method}", json=params, timeout=TIMEOUT)
        body = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise TelegramError(f"Telegram could not be reached: {exc.__class__.__name__}") from exc
    if not body.get("ok"):
        raise TelegramError(body.get("description") or f"Telegram refused {method}")
    return body.get("result") or {}


def get_me(token: str) -> dict:
    return _call(token, "getMe")


def set_webhook(token: str, url: str, secret: str) -> None:
    _call(
        token,
        "setWebhook",
        url=url,
        secret_token=secret,
        allowed_updates=["message", "callback_query"],
        drop_pending_updates=True,
    )


def delete_webhook(token: str) -> None:
    _call(token, "deleteWebhook", drop_pending_updates=True)


def send_message(token: str, chat_id: int, text: str, *, choices: list[dict] | None = None) -> None:
    params: dict = {"chat_id": chat_id, "text": text[:4096], "disable_web_page_preview": True}
    if choices:
        params["reply_markup"] = {
            "inline_keyboard": [[{"text": c["label"], "callback_data": c["send"][:64]} for c in choices]]
        }
    _call(token, "sendMessage", **params)


def send_voice(token: str, chat_id: int, audio: bytes) -> None:
    _call(token, "sendVoice", chat_id=chat_id, files={"voice": ("reply.ogg", audio, "audio/ogg")})


def send_chat_action(token: str, chat_id: int, action: str) -> None:
    try:
        _call(token, "sendChatAction", chat_id=chat_id, action=action)
    except TelegramError:
        pass  # a courtesy, never worth failing the turn over


def answer_callback(token: str, callback_id: str) -> None:
    try:
        _call(token, "answerCallbackQuery", callback_query_id=callback_id)
    except TelegramError:
        pass


def download_file(token: str, file_id: str) -> tuple[bytes, str]:
    """The bytes of a file a visitor sent, and its name on Telegram's side."""
    info = _call(token, "getFile", file_id=file_id)
    path = info.get("file_path") or ""
    if not path:
        raise TelegramError("Telegram gave no path for that file")
    try:
        response = requests.get(f"{settings.TELEGRAM_API_BASE}/file/bot{token}/{path}", timeout=TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise TelegramError(f"The voice note could not be fetched: {exc.__class__.__name__}") from exc
    return response.content, path.rsplit("/", 1)[-1]
