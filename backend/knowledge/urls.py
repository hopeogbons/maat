from django.urls import path

from knowledge import api

urlpatterns = [
    path("", api.DocumentsView.as_view(), name="api_documents"),
    path("sources/", api.SourcesView.as_view(), name="api_document_sources"),
    path("sources/<slug:slug>/refresh/", api.SourceRefreshView.as_view(), name="api_source_refresh"),
]
