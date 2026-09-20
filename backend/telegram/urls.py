from django.urls import path

from telegram import api

urlpatterns = [
    path("", api.TelegramView.as_view(), name="api_telegram"),
    path("webhook/", api.TelegramWebhookView.as_view(), name="api_telegram_webhook"),
]
