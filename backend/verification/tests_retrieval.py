"""What a verdict may lean on: global passages, and those of countries switched on."""

from django.test import TestCase

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.models import Chunk, Document, Source
from verification.retrieval import scoped


class ScopeTests(TestCase):
    def setUp(self):
        self.ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        self.ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=self.ng, is_active=True)
        self.kenya = CountryCoverage.objects.create(country=self.ke, is_active=False)
        source = Source.objects.create(name="WHO", slug="who")
        for code, country in (("global", None), ("NG", self.ng), ("KE", self.ke)):
            document = Document.objects.create(
                source=source, title=code, identifier=f"{code}.txt", fingerprint=code, country=country, is_current=True
            )
            Chunk.objects.create(document=document, chunk_index=0, text=f"passage {code}", is_current=True)

    def _titles(self, country=None):
        return sorted(chunk.document.title for chunk in scoped(country))

    def test_a_country_switched_off_is_not_searched_even_by_name(self):
        self.assertEqual(self._titles(), ["NG", "global"])
        self.assertEqual(self._titles(self.ke), ["global"])

    def test_switching_it_on_brings_its_passages_into_reach(self):
        self.kenya.is_active = True
        self.kenya.save()
        self.assertEqual(self._titles(), ["KE", "NG", "global"])
        self.assertEqual(self._titles(self.ke), ["KE", "global"])
