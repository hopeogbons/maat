from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="account_home"),
    path("login/", views.MaatLoginView.as_view(), name="login"),
    path("logout/", views.MaatLogoutView.as_view(), name="logout"),
]
