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
