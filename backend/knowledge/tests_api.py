"""What the dashboard is shown: global rows and the countries switched on."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.models import Document, Source


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
