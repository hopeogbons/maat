from django.urls import path

from core import api

urlpatterns = [
    path("", api.ReferenceView.as_view(), name="api_reference"),
]
