from django.urls import path

from verification import api
from verification.conversations import ConversationTranscriptView, ConversationsView

urlpatterns = [
    path("", api.ChatView.as_view(), name="api_chat"),
    path("stream/", api.ChatStreamView.as_view(), name="api_chat_stream"),
    path("voice/", api.VoiceChatView.as_view(), name="api_chat_voice"),
    path("document/<uuid:pk>/", api.DocumentDownloadView.as_view(), name="api_chat_document"),
    path("conversations/", ConversationsView.as_view(), name="api_conversations"),
    path("conversations/<uuid:pk>/", ConversationTranscriptView.as_view(), name="api_conversation"),
]
