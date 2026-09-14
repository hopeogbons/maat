from django.urls import path

from . import api

urlpatterns = [
    path("session/", api.SessionView.as_view(), name="api_session"),
    path("login/", api.LoginView.as_view(), name="api_login"),
    path("logout/", api.LogoutView.as_view(), name="api_logout"),
    path("profile/", api.ProfileView.as_view(), name="api_profile"),
]
