"""Leg three: asking the APIs on consent, and storing what they say."""

from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.lookup import Fact, lookup, world_bank
from knowledge.models import Document, Source

WB_INFLATION = [
    {"page": 1},
    [
        {"date": "2025", "value": 24.7},
        {"date": "2024", "value": 33.2},
        {"date": "2023", "value": None},
    ],
]


class WorldBankAdapterTests(TestCase):
    def setUp(self):
        self.ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")

    def test_a_claim_about_inflation_becomes_a_quotable_fact(self):
        with patch("knowledge.lookup._get_json", return_value=WB_INFLATION):
            facts = world_bank("I heard inflation in Nigeria is now over 30 percent", self.ng, "https://api.worldbank.org/v2/")
        self.assertEqual(len(facts), 1)
        self.assertIn("2025", facts[0].text)
        self.assertIn("24.7", facts[0].text)
        self.assertIn("World Bank", facts[0].text)
        # A null year is not reported as a figure.
        self.assertNotIn("2023", facts[0].text)

    def test_a_claim_with_no_matching_series_asks_nothing(self):
        with patch("knowledge.lookup._get_json") as get:
            self.assertEqual(world_bank("I heard the minister resigned", self.ng, "https://api.worldbank.org/v2/"), [])
            get.assert_not_called()

    def test_an_endpoint_failure_yields_nothing_rather_than_raising(self):
        with patch("knowledge.lookup._get_json", side_effect=OSError("down")):
            self.assertEqual(world_bank("inflation", self.ng, "https://api.worldbank.org/v2/"), [])


class LookupTests(TestCase):
    def setUp(self):
        self.ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        CountryCoverage.objects.create(country=self.ng, is_active=True)
        self.wb = Source.objects.create(
            name="World Bank", slug="world-bank-ng", door=Source.Door.API,
            address="https://api.worldbank.org/v2/country/NGA/indicator/", country=self.ng,
        )

    def test_facts_are_stored_as_documents_under_the_country(self):
        fact = Fact(title="Inflation: Nigeria", text="Inflation for Nigeria, according to the World Bank:\nIn 2025, inflation was 24.7.", url="https://data.worldbank.org/x")
        with patch("knowledge.lookup.world_bank", return_value=[fact]):
            written = lookup("inflation is over 30 percent", self.ng)
        self.assertEqual(len(written), 1)
        doc = Document.active.get()
        self.assertEqual(doc.country, self.ng)
        self.assertEqual(doc.source, self.wb)
        self.assertEqual(doc.title, "Inflation: Nigeria")
        self.assertGreater(doc.chunks.count(), 0)

    def test_no_country_means_no_call(self):
        with patch("knowledge.lookup.world_bank") as wb:
            self.assertEqual(lookup("inflation", None), [])
            wb.assert_not_called()

    def test_a_country_switched_off_is_not_asked(self):
        ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=ke, is_active=False)
        Source.objects.create(name="World Bank", slug="world-bank", door=Source.Door.API,
                              address="https://api.worldbank.org/v2/", country=None)
        with patch("knowledge.lookup.world_bank") as wb:
            self.assertEqual(lookup("population", ke), [])
            wb.assert_not_called()

    def test_a_country_with_no_api_sources_falls_back_to_global_ones(self):
        ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=ke, is_active=True)
        Source.objects.create(name="World Bank", slug="world-bank", door=Source.Door.API,
                              address="https://api.worldbank.org/v2/", country=None)
        fact = Fact(title="Population: Kenya", text="Population for Kenya, according to the World Bank:\nIn 2025, population was 56,000,000.", url="https://x")
        with patch("knowledge.lookup.world_bank", return_value=[fact]) as wb:
            written = lookup("population", ke)
        self.assertEqual(len(written), 1)
        self.assertEqual(written[0].country, ke)
        wb.assert_called_once()
