from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView, LogoutView
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render

from .forms import MaatAuthenticationForm


class MaatLoginView(LoginView):
    template_name = "accounts/login.html"
    authentication_form = MaatAuthenticationForm
    redirect_authenticated_user = True


class MaatLogoutView(LogoutView):
    """POST-only, as Django requires. Renders the signed-out page with a link back to the site."""

    template_name = "accounts/logged_out.html"


@login_required
def home(request: HttpRequest) -> HttpResponse:
    return render(request, "accounts/home.html")
