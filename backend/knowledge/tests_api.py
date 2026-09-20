"""What the dashboard is shown: global rows and the countries switched on."""

from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.models import Document, IngestionRun, Source


class ShownTests(TestCase):
    """Nigeria is on. Kenya is on the list but off. Ghana was never added."""

    def setUp(self):
        ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566", flag_emoji="🇳🇬")
        ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404", flag_emoji="🇰🇪")
        gh = Country.objects.create(name="Ghana", iso2="GH", iso3="GHA", numeric_code="288", flag_emoji="🇬🇭")
        CountryCoverage.objects.create(country=ng, is_active=True)
        self.kenya = CountryCoverage.objects.create(country=ke, is_active=False)
        self.sources = {
            "": Source.objects.create(name="World Health Organization", slug="who"),
            "NG": Source.objects.create(name="Nigeria Centre for Disease Control", slug="ncdc", country=ng),
            "KE": Source.objects.create(name="Kenya Ministry of Health", slug="ke-moh", country=ke),
            "GH": Source.objects.create(name="Ghana Health Service", slug="ghs", country=gh),
        }
        for code, source in self.sources.items():
            Document.objects.create(
                source=source, title=f"Bulletin {code or 'global'}", identifier=f"{code or 'global'}.txt",
                fingerprint=code or "global", country=source.country, is_current=True,
            )
        self.client.force_login(get_user_model().objects.create_user(username="staff", password="x" * 12))

    def _countries(self, path, key):
        return sorted(row["country"] for row in self.client.get(path).json()[key])

    def test_sources_of_countries_not_switched_on_are_not_shown(self):
        self.assertEqual(self._countries("/api/documents/sources/", "sources"), ["", "NG"])

    def test_documents_of_countries_not_switched_on_are_not_shown(self):
        self.assertEqual(self._countries("/api/documents/", "documents"), ["", "NG"])

    def test_a_document_carries_what_its_publishers_mark_needs(self):
        self.sources["NG"].short = "NCDC"
        self.sources["NG"].brand = "#0A6E3B"
        self.sources["NG"].save()
        row = next(d for d in self.client.get("/api/documents/").json()["documents"] if d["country"] == "NG")
        self.assertEqual((row["source"], row["sourceShort"], row["sourceBrand"], row["sourceLogo"]), ("Nigeria Centre for Disease Control", "NCDC", "#0A6E3B", ""))

    def test_switching_a_country_on_shows_what_it_already_held(self):
        self.kenya.is_active = True
        self.kenya.save()
        self.assertEqual(self._countries("/api/documents/sources/", "sources"), ["", "KE", "NG"])
        self.assertEqual(self._countries("/api/documents/", "documents"), ["", "KE", "NG"])

    def test_dropping_a_country_from_the_list_hides_it_again(self):
        self.kenya.is_active = True
        self.kenya.save()
        self.kenya.delete()  # soft
        self.assertEqual(self._countries("/api/documents/sources/", "sources"), ["", "NG"])


class SourceRefreshTests(TestCase):
    """The refresh button: pull now, and say what the pull did."""

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="staff", password="x")
        cls.feed = Source.objects.create(
            name="World Health Organization", slug="who-feed", door=Source.Door.FEED, address="https://who.example/feed"
        )
        cls.upload = Source.objects.create(name="By hand", slug="by-hand", door=Source.Door.UPLOAD)

    def setUp(self):
        self.client.force_login(self.user)

    def test_it_polls_the_source_now_and_reports_what_arrived(self):
        run = IngestionRun(source=self.feed, status=IngestionRun.Status.SUCCEEDED, documents_seen=4, documents_added=2)
        run.save()
        with mock.patch("knowledge.api.poll_now", return_value=run) as poll:
            response = self.client.post(f"/api/documents/sources/{self.feed.slug}/refresh/")

        poll.assert_called_once()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["run"]["added"], 2)
        self.assertEqual(response.data["source"]["slug"], "who-feed")

    def test_a_hand_upload_has_nothing_to_pull(self):
        response = self.client.post(f"/api/documents/sources/{self.upload.slug}/refresh/")

        self.assertEqual(response.status_code, 400)
        self.assertIn("by hand", response.data["detail"])

    def test_a_reader_that_raises_is_reported_not_swallowed(self):
        with mock.patch("knowledge.api.poll_now", side_effect=RuntimeError("host unreachable")):
            response = self.client.post(f"/api/documents/sources/{self.feed.slug}/refresh/")

        self.assertEqual(response.status_code, 502)
        self.assertIn("host unreachable", response.data["detail"])

    def test_it_needs_a_signed_in_user(self):
        self.client.logout()
        response = self.client.post(f"/api/documents/sources/{self.feed.slug}/refresh/")
        self.assertIn(response.status_code, (401, 403))
