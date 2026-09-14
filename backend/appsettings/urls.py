from django.urls import path

from appsettings import api

urlpatterns = [
    path("", api.SettingsView.as_view(), name="api_settings"),
    path("countries/", api.CoverageView.as_view(), name="api_coverage"),
    path("countries/<str:iso2>/", api.CoverageView.as_view(), name="api_coverage_detail"),
]
