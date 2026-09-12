from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse


@override_settings(FRONTEND_URL="https://maat.example")
class SignInPagesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="hope", password="weigh-the-feather")

    def test_login_page_is_branded_and_links_home(self):
        response = self.client.get(reverse("login"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sign in")
        self.assertContains(response, 'href="https://maat.example"')
        self.assertContains(response, "accounts/auth.css")

    def test_wrong_password_shows_amber_error_not_stack_trace(self):
        response = self.client.post(reverse("login"), {"username": "hope", "password": "nope"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'class="alert"')
        self.assertFalse(response.wsgi_request.user.is_authenticated)

    def test_successful_login_redirects_to_account_home(self):
        response = self.client.post(reverse("login"), {"username": "hope", "password": "weigh-the-feather"})
        self.assertRedirects(response, reverse("account_home"))
        home = self.client.get(reverse("account_home"))
        self.assertContains(home, "signed in as <strong>hope</strong>")

    def test_next_parameter_is_honoured(self):
        response = self.client.post(
            reverse("login") + "?next=/admin/",
            {"username": "hope", "password": "weigh-the-feather", "next": "/admin/"},
        )
        self.assertRedirects(response, "/admin/", fetch_redirect_response=False)

    def test_account_home_requires_login(self):
        response = self.client.get(reverse("account_home"))
        self.assertRedirects(response, f"{reverse('login')}?next={reverse('account_home')}")

    def test_logout_is_post_only_and_links_back_to_site(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(reverse("logout")).status_code, 405)
        response = self.client.post(reverse("logout"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "signed out")
        self.assertContains(response, 'href="https://maat.example"')
        self.assertFalse(response.wsgi_request.user.is_authenticated)
