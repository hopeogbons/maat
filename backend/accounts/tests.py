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


@override_settings(FRONTEND_URL="https://maat.example")
class AdminChromeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.staff = get_user_model().objects.create_superuser(
            username="scribe", email="scribe@maat.example", password="weigh-the-feather"
        )

    def test_admin_logout_shows_the_branded_page_not_djangos(self):
        self.client.force_login(self.staff)
        response = self.client.post("/admin/logout/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "You’re signed out")
        self.assertContains(response, "accounts/auth.css")
        self.assertNotContains(response, "quality time with the web site")
        # A stray template comment once leaked above the doctype; keep that fixed.
        self.assertTrue(response.content.lstrip().startswith(b"<!doctype html>"))

    def test_admin_header_wears_the_maat_name_and_skin(self):
        self.client.force_login(self.staff)
        response = self.client.get("/admin/")
        self.assertContains(response, "Ma’at administration")
        self.assertContains(response, "accounts/admin.css")
        self.assertContains(response, 'href="https://maat.example"')


class SessionApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="hope", password="weigh-the-feather", first_name="Hope", last_name="Ogbons"
        )

    def test_session_is_anonymous_until_sign_in_and_sets_the_csrf_cookie(self):
        response = self.client.get("/api/auth/session/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload["authenticated"])
        self.assertTrue(payload["csrfToken"])
        self.assertIn("csrftoken", response.cookies)

    def test_sign_in_returns_the_person_and_opens_a_session(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "hope", "password": "weigh-the-feather"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload.pop("csrfToken"))
        self.assertEqual(
            payload,
            {
                "authenticated": True,
                "username": "hope",
                "name": "Hope Ogbons",
                "title": "Member",
                "avatarUrl": "",
                "isStaff": False,
                "isSuperuser": False,
            },
        )
        session = self.client.get("/api/auth/session/").json()
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["username"], "hope")

    def test_wrong_password_is_a_400_that_names_neither_field(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "hope", "password": "nope"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Those details do not match an account.")
        self.assertFalse(self.client.get("/api/auth/session/").json()["authenticated"])

    def test_missing_fields_are_rejected_before_the_database_is_touched(self):
        response = self.client.post("/api/auth/login/", {}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Enter your username and password.")

    def test_sign_out_closes_the_session(self):
        self.client.force_login(self.user)
        response = self.client.post("/api/auth/logout/", content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.client.get("/api/auth/session/").json()["authenticated"])


class CsrfOriginTests(TestCase):
    """The front end sits on another port, so its POSTs need a trusted origin."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="hope", password="weigh-the-feather")

    def test_frontend_origin_is_trusted_for_signed_in_posts(self):
        from django.conf import settings

        self.assertIn(settings.FRONTEND_URL, settings.CSRF_TRUSTED_ORIGINS)

    def test_sign_out_survives_the_origin_check(self):
        self.client.force_login(self.user)
        from django.conf import settings

        response = self.client.post(
            "/api/auth/logout/",
            content_type="application/json",
            headers={"origin": settings.FRONTEND_URL},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(self.client.get("/api/auth/session/").json()["authenticated"])


class ApiAuthenticationTests(TestCase):
    """Basic auth would be an unthrottled password oracle; it must be off."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="hope", password="weigh-the-feather")

    def test_basic_auth_is_not_accepted_on_the_api(self):
        import base64

        token = base64.b64encode(b"hope:weigh-the-feather").decode()
        response = self.client.get("/api/auth/session/", headers={"authorization": f"Basic {token}"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])

    def test_sign_in_hands_back_the_rotated_csrf_token(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "hope", "password": "weigh-the-feather"},
            content_type="application/json",
        )
        self.assertTrue(response.json()["csrfToken"])

    def test_throttle_is_not_keyed_on_a_header_the_caller_controls(self):
        from django.conf import settings

        self.assertEqual(settings.REST_FRAMEWORK["NUM_PROXIES"], 0)


class ProfileTests(TestCase):
    def test_every_new_user_gets_a_profile(self):
        user = get_user_model().objects.create_user(
            username="hope", password="x", first_name="Hope", last_name="Ogbons"
        )
        self.assertEqual(user.profile.first_name, "Hope")
        self.assertEqual(user.profile.display_name, "Hope Ogbons")

    def test_display_name_falls_back_to_the_username(self):
        user = get_user_model().objects.create_user(username="scribe", password="x")
        self.assertEqual(user.profile.display_name, "scribe")

    def test_deleting_the_user_takes_the_profile_with_it(self):
        from accounts.models import Profile

        user = get_user_model().objects.create_user(username="temp", password="x")
        user.delete()
        self.assertFalse(Profile.objects.filter(user_id=user.pk).exists())


class ProfileApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="hope@maat.example", password="weigh-the-feather", email="hope@maat.example"
        )

    def test_session_prefers_the_role_label_until_a_title_is_set(self):
        self.client.force_login(self.user)
        payload = self.client.get("/api/auth/session/").json()
        self.assertEqual(payload["username"], "hope@maat.example")
        self.assertEqual(payload["name"], "")
        self.assertEqual(payload["title"], "Member")

    def test_a_superuser_is_described_as_an_administrator(self):
        boss = get_user_model().objects.create_superuser(
            username="boss", email="boss@maat.example", password="x"
        )
        self.client.force_login(boss)
        self.assertEqual(self.client.get("/api/auth/session/").json()["title"], "Administrator")

    def test_profile_requires_a_session(self):
        self.assertEqual(self.client.get("/api/auth/profile/").status_code, 403)

    def test_saving_a_name_and_title_shows_up_in_the_session(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            "/api/auth/profile/",
            {"first_name": "Hope", "last_name": "Ogbons", "job_title": "Verification lead"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Hope Ogbons")

        session = self.client.get("/api/auth/session/").json()
        self.assertEqual(session["name"], "Hope Ogbons")
        self.assertEqual(session["title"], "Verification lead")

    def test_a_person_cannot_promote_themselves_through_their_profile(self):
        self.client.force_login(self.user)
        self.client.patch(
            "/api/auth/profile/",
            {"is_staff": True, "is_superuser": True, "first_name": "Hope"},
            content_type="application/json",
        )
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)

    def test_reference_data_lists_countries_and_timezones(self):
        from django.core.management import call_command

        call_command("seed_currencies_and_timezones", verbosity=0)
        call_command("sync_countries_and_states", verbosity=0, skip_states=True)
        self.client.force_login(self.user)
        payload = self.client.get("/api/reference/").json()
        self.assertGreater(len(payload["countries"]), 200)
        self.assertGreater(len(payload["timezones"]), 400)
        self.assertIn("Nigeria", [c["name"] for c in payload["countries"]])
