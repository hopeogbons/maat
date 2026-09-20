"""Connecting the bot from the dashboard, and the door Telegram knocks on.

Connecting is one paste: the token from BotFather. Ma'at checks it with
Telegram, registers this API's webhook with a secret of its own, and from
then on every message to the bot arrives here. Disconnecting tells Telegram
to stop and forgets the token.
"""

from __future__ import annotations

import hmac
import secrets
from threading import Thread

from django.conf import settings
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from telegram import client
from telegram.models import TelegramBot
from telegram.webhook import handle_update


def _payload(bot: TelegramBot) -> dict:
    return {
        "connected": bot.connected,
        "username": bot.username,
        "webhookUrl": bot.webhook_url,
        "connectedAt": bot.connected_at.isoformat() if bot.connected_at else "",
        "lastError": bot.last_error,
        "messages": bot.messages,
        "lastUpdateAt": bot.last_update_at.isoformat() if bot.last_update_at else "",
        "hasEnvToken": bool(settings.TELEGRAM_BOT_TOKEN),
    }


def _public_url(request: Request, path: str) -> str:
    base = settings.PUBLIC_API_URL or request.build_absolute_uri("/").rstrip("/")
    return f"{base}{path}"


class TelegramView(APIView):
    """GET the bot's standing; PUT {"token"} to connect; DELETE to disconnect."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(_payload(TelegramBot.current()))

    def put(self, request: Request) -> Response:
        # Pasted, or already in the server's environment.
        token = (request.data.get("token") or "").strip() or settings.TELEGRAM_BOT_TOKEN
        if not token or ":" not in token:
            return Response({"detail": "Paste the token BotFather gave you."}, status=status.HTTP_400_BAD_REQUEST)
        bot = TelegramBot.current()
        secret = secrets.token_urlsafe(32)
        url = _public_url(request, reverse("api_telegram_webhook"))
        try:
            me = client.get_me(token)
            client.set_webhook(token, url, secret)
        except client.TelegramError as exc:
            bot.last_error = str(exc)[:300]
            bot.save(update_fields=["last_error"])
            return Response({"detail": str(exc), **_payload(bot)}, status=status.HTTP_400_BAD_REQUEST)
        bot.token = token
        bot.username = me.get("username") or ""
        bot.webhook_secret = secret
        bot.webhook_url = url
        bot.connected_at = timezone.now()
        bot.last_error = ""
        bot.save()
        return Response(_payload(bot))

    def delete(self, request: Request) -> Response:
        bot = TelegramBot.current()
        if bot.token:
            try:
                client.delete_webhook(bot.token)
            except client.TelegramError as exc:
                bot.last_error = str(exc)[:300]
        bot.token = ""
        bot.username = ""
        bot.webhook_secret = ""
        bot.webhook_url = ""
        bot.connected_at = None
        bot.save()
        return Response(_payload(bot))


class TelegramWebhookView(APIView):
    """Where Telegram delivers updates. Answered at once; the turn runs behind."""

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        bot = TelegramBot.current()
        given = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not bot.connected or not hmac.compare_digest(given, bot.webhook_secret):
            return Response({"detail": "Not for you."}, status=status.HTTP_403_FORBIDDEN)
        update = request.data if isinstance(request.data, dict) else {}

        if getattr(settings, "CHAT_STREAM_INLINE", False):
            handle_update(bot, update)
        else:
            def on_thread() -> None:
                try:
                    handle_update(bot, update)
                finally:
                    connection.close()

            Thread(target=on_thread, daemon=True).start()
        return Response({"ok": True})

