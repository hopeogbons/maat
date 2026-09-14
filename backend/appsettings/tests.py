from django.test import TestCase

from appsettings.models import AppSetting


class AppSettingTests(TestCase):
    def test_defaults_are_the_agreed_numbers(self):
        settings = AppSetting.current()
        self.assertEqual(settings.confidence_gate, 85)
        self.assertEqual(settings.mentions_before_publish, 3)
        self.assertEqual(settings.max_followup_questions, 2)

    def test_current_returns_the_same_row_every_time(self):
        first = AppSetting.current()
        self.assertEqual(AppSetting.current().pk, first.pk)
        self.assertEqual(AppSetting.objects.count(), 1)

    def test_a_second_row_folds_into_the_first(self):
        first = AppSetting.current()
        AppSetting(confidence_gate=70).save()
        self.assertEqual(AppSetting.objects.count(), 1)
        first.refresh_from_db()
        self.assertEqual(first.confidence_gate, 70)


class CoverageTests(TestCase):
    """Coverage is a decision, and the only list the dashboard may offer."""

    def setUp(self):
        from django.contrib.auth import get_user_model
        from core.models import Country

        # Created here rather than relied upon: the reference catalogues are
        # seeded by a bootstrap command, which the test database never runs.
        self.ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566", flag_emoji="🇳🇬")
        self.ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404", flag_emoji="🇰🇪")
        self.user = get_user_model().objects.create_user(username="staff", password="x" * 12)
        self.client.force_login(self.user)

    def test_signing_in_is_required(self):
        self.client.logout()
        self.assertIn(self.client.get("/api/settings/").status_code, (401, 403))

    def test_a_country_is_added_switched_off_and_can_be_switched_on(self):
        r = self.client.post("/api/settings/countries/", {"iso2": "NG"}, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.data["countries"][0]["isActive"])

        r = self.client.patch(
            "/api/settings/countries/NG/", {"isActive": True}, content_type="application/json"
        )
        self.assertTrue(r.data["countries"][0]["isActive"])

    def test_asking_for_it_active_on_creation_is_ignored(self):
        r = self.client.post(
            "/api/settings/countries/", {"iso2": "NG", "isActive": True}, content_type="application/json"
        )
        self.assertFalse(r.data["countries"][0]["isActive"])

    def test_the_same_country_is_not_covered_twice(self):
        self.client.post("/api/settings/countries/", {"iso2": "KE"}, content_type="application/json")
        self.assertEqual(self.client.post("/api/settings/countries/", {"iso2": "KE"}, content_type="application/json").status_code, 409)

    def test_an_unknown_code_is_refused(self):
        self.assertEqual(self.client.post("/api/settings/countries/", {"iso2": "ZZ"}, content_type="application/json").status_code, 400)

    def test_a_dropped_country_can_be_added_again(self):
        self.client.post("/api/settings/countries/", {"iso2": "NG"}, content_type="application/json")
        self.client.patch("/api/settings/countries/NG/", {"isActive": True}, content_type="application/json")
        self.client.delete("/api/settings/countries/NG/")
        r = self.client.post("/api/settings/countries/", {"iso2": "NG"}, content_type="application/json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(len(r.data["countries"]), 1)
        # Back on the list, and switched off again rather than inheriting the
        # active flag it had before it was dropped.
        self.assertFalse(r.data["countries"][0]["isActive"])

    def test_dropping_a_country_removes_it_from_the_list(self):
        self.client.post("/api/settings/countries/", {"iso2": "NG"}, content_type="application/json")
        r = self.client.delete("/api/settings/countries/NG/")
        self.assertEqual(r.data["countries"], [])

    def test_the_numbers_are_editable_and_validated(self):
        r = self.client.patch(
            "/api/settings/", {"mentions_before_publish": 5}, content_type="application/json"
        )
        self.assertEqual(r.data["settings"]["mentions_before_publish"], 5)
        # A gate above 100 is meaningless, and is refused rather than stored.
        bad = self.client.patch("/api/settings/", {"confidence_gate": 500}, content_type="application/json")
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(AppSetting.current().confidence_gate, 85)
