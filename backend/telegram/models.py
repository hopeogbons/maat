"""The Telegram bot, if one is connected.

One row. The token comes from BotFather and is pasted into the dashboard;
connecting verifies it with Telegram, registers the webhook and remembers
what came back. Nothing else about Telegram is stored here: a chat is a
Conversation like any other, keyed by its chat id.
"""

from __future__ import annotations

from django.db import models

from core.models import BaseModel


class TelegramBot(BaseModel):
    #: From BotFather. Never returned by the API once stored.
    token = models.CharField(max_length=120, blank=True)
    username = models.CharField(max_length=64, blank=True)
    #: Telegram sends this back on every update; anything without it is refused.
    webhook_secret = models.CharField(max_length=80, blank=True)
    webhook_url = models.CharField(max_length=300, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=300, blank=True)
    last_update_at = models.DateTimeField(null=True, blank=True)
    messages = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Telegram bot"

    @classmethod
    def current(cls) -> "TelegramBot":
        row = cls.active.order_by("created_at").first()
        return row or cls.objects.create()

    @property
    def connected(self) -> bool:
        return bool(self.token and self.webhook_secret)

    def __str__(self) -> str:
        return f"@{self.username}" if self.username else "Telegram bot (not connected)"
