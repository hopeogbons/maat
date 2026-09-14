from django.urls import include, path

from verification.dashboard import DashboardView

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/", include("accounts.api_urls")),
    path("reference/", include("core.urls")),
    path("chat/", include("verification.urls")),
    path("documents/", include("knowledge.urls")),
    path("settings/", include("appsettings.urls")),
    path("dashboard/", DashboardView.as_view(), name="api_dashboard"),
]
