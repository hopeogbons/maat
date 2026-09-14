from django.urls import path

from verification import api

urlpatterns = [
    path("", api.ChatView.as_view(), name="api_chat"),
    path("document/<uuid:pk>/", api.DocumentDownloadView.as_view(), name="api_chat_document"),
]
