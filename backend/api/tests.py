from django.test import TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    def test_health_reports_ok_with_database(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["service"], "maat-api")
        self.assertEqual(body["database"], "ok")
        self.assertIn("time", body)

    def test_health_sends_cors_header_for_allowed_origin(self):
        with self.settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173"]):
            response = self.client.get(reverse("health"), HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(response["Access-Control-Allow-Origin"], "http://localhost:5173")


class PublicCoverageTests(TestCase):
    """The widget learns which countries are on, and so which languages to offer."""

    def test_only_countries_switched_on_are_listed_and_nobody_needs_to_sign_in(self):
        from appsettings.models import CountryCoverage
        from core.models import Country

        ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=ng, is_active=True)
        CountryCoverage.objects.create(country=ke, is_active=False)
        response = self.client.get("/api/coverage/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([c["iso2"] for c in response.json()["countries"]], ["NG"])
