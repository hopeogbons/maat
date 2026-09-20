from django.urls import include, path

from verification.articles import ArticlesView
from verification.dashboard import DashboardView

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("coverage/", views.coverage, name="api_public_coverage"),
    path("articles/", ArticlesView.as_view(), name="api_public_articles"),
    path("auth/", include("accounts.api_urls")),
    path("reference/", include("core.urls")),
    path("chat/", include("verification.urls")),
    path("documents/", include("knowledge.urls")),
    path("settings/", include("appsettings.urls")),
    path("dashboard/", DashboardView.as_view(), name="api_dashboard"),
    path("telegram/", include("telegram.urls")),
]
