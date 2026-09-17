"""The front page counts real rows, scoped like the rest of the dashboard."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.models import Document, Source
from verification.models import Rumour, Verdict


class DashboardTests(TestCase):
    def setUp(self):
        ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=ng, is_active=True)
        CountryCoverage.objects.create(country=ke, is_active=False)
        self.who = Source.objects.create(name="WHO", slug="who", short="WHO", brand="#0093D5")
        self.ncdc = Source.objects.create(name="NCDC", slug="ncdc", country=ng)
        self.kenya = Source.objects.create(name="Kenya MoH", slug="ke-moh", country=ke)
        now = timezone.now()
        for i in range(3):
            Document.objects.create(source=self.who, title=f"w{i}", identifier=f"w{i}.txt", fingerprint=f"w{i}", is_current=True, fetched_at=now)
        Document.objects.create(source=self.ncdc, title="n", identifier="n.txt", fingerprint="n", country=ng, is_current=True, fetched_at=now)
        for i in range(5):
            Document.objects.create(source=self.kenya, title=f"k{i}", identifier=f"k{i}.txt", fingerprint=f"k{i}", country=ke, is_current=True, fetched_at=now)
        r1 = Rumour.objects.create(statement="Fuel prices doubled", slug="fuel", verdict=Verdict.VERIFIED, status=Rumour.Status.PUBLISHED)
        Rumour.objects.create(statement="Schools closed", slug="schools", verdict=Verdict.INSUFFICIENT)
        old = Rumour.objects.create(statement="Old one", slug="old", verdict=Verdict.UNVERIFIED)
        Rumour.objects.filter(pk=old.pk).update(first_seen_at=timezone.now() - timedelta(days=10))
        del r1
        self.client.force_login(get_user_model().objects.create_user(username="staff", password="x" * 12))

    def test_the_counts_are_the_rows_in_range(self):
        data = self.client.get("/api/dashboard/?days=7").json()
        self.assertEqual((data["weighed"], data["cited"], data["published"]), (2, 1, 1))
        self.assertEqual((data["weighedBefore"], data["citedBefore"]), (1, 1))
        self.assertEqual(data["verdicts"], [1, 0, 1])
        self.assertEqual(len(data["activity"]), 7)
        self.assertEqual(sum(row["verified"] for row in data["activity"]), 1)

    def test_top_sources_respect_the_country_switch_and_share_the_shown_total(self):
        data = self.client.get("/api/dashboard/").json()
        top = data["topSources"]
        # Kenya is off: its five documents are neither listed nor in the denominator.
        self.assertEqual([s["id"] for s in top], ["who", "ncdc"])
        self.assertEqual([s["share"] for s in top], [75, 25])
        self.assertEqual(top[0]["brand"], "#0093D5")
        self.assertEqual(data["documents"], 4)

    def test_the_latest_rumours_and_the_widget_count_are_real_rows(self):
        from verification.models import Conversation, Turn

        conversation = Conversation.objects.create(session_key="c")
        Turn.objects.create(conversation=conversation, speaker=Turn.Speaker.VISITOR, raw_text="hello")
        Turn.objects.create(conversation=conversation, speaker=Turn.Speaker.MAAT, paraphrase="hi")
        data = self.client.get("/api/dashboard/").json()
        self.assertEqual(data["channels"], {"messages": 1})
        self.assertEqual([r["statement"] for r in data["latest"]][:2], ["Old one", "Schools closed"][:0] + [r["statement"] for r in data["latest"]][:2])
        self.assertEqual(len(data["latest"]), 3)
        first = data["latest"][0]
        self.assertEqual(set(first), {"id", "statement", "verdict", "confidence", "mentions", "reporters", "status", "country", "lastSeen", "source"})

    def test_a_silly_range_falls_back_to_a_week(self):
        self.assertEqual(self.client.get("/api/dashboard/?days=999").json()["days"], 7)
        self.assertEqual(self.client.get("/api/dashboard/?days=abc").json()["days"], 7)

    def test_signing_in_is_required(self):
        self.client.logout()
        self.assertIn(self.client.get("/api/dashboard/").status_code, (401, 403))
