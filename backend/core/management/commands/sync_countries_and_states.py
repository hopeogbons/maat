"""Seed the ISO 3166-1 countries and their ISO 3166-2 subdivisions.

Run after `seed_currencies_and_timezones`: each country links to the currency
its territory uses, and that row has to exist first.

Where the data comes from, all of it already on the machine:

  name, iso2, iso3, numeric   pycountry (the ISO register)
  currency                    Babel (CLDR territory data), most recent first
  phone code                  phonenumbers (Google's libphonenumber metadata)
  flag emoji                  derived from iso2, two regional indicator letters
  subdivisions                pycountry (the ISO 3166-2 register)

Subdivision time zones are deliberately left empty. No offline dataset maps a
province to a zone, and guessing one would put a wrong answer in a catalogue
whose only job is to be right.

Safe to run again: rows are matched on iso2, and subdivisions on their code
within a country, then updated in place.
"""

from __future__ import annotations

import phonenumbers
import pycountry
from babel.numbers import get_territory_currencies
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Country, Currency, StateProvince

#: Offset from an ASCII capital letter to its regional indicator symbol. Two of
#: them side by side are what a browser or a phone draws as a flag.
_REGIONAL_INDICATOR = ord("\U0001f1e6") - ord("A")


def _flag(iso2: str) -> str:
    return "".join(chr(ord(letter) + _REGIONAL_INDICATOR) for letter in iso2.upper())


def _phone_code(iso2: str) -> str:
    code = phonenumbers.country_code_for_region(iso2)
    return f"+{code}" if code else ""


def _currency_code(iso2: str) -> str | None:
    """The territory's current currency, newest first, or None if it has none."""
    codes = get_territory_currencies(iso2, tender=True)
    return codes[-1] if codes else None


class Command(BaseCommand):
    help = "Seed ISO 3166-1 countries and ISO 3166-2 subdivisions. Safe to run repeatedly."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-states",
            action="store_true",
            help="Countries only. Useful on a first run when you want the catalogue quickly.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        currencies = {c.code: c for c in Currency.objects.all()}
        if not currencies:
            self.stdout.write(
                self.style.WARNING(
                    "No currencies found. Run seed_currencies_and_timezones first, "
                    "or countries will be linked to nothing."
                )
            )

        countries = self._seed_countries(currencies)
        self.stdout.write(self.style.SUCCESS(f"Countries: {countries}."))

        if options["skip_states"]:
            self.stdout.write("Subdivisions skipped.")
            return
        self.stdout.write(self.style.SUCCESS(f"Subdivisions: {self._seed_states()}."))

    def _seed_countries(self, currencies) -> str:
        created = updated = 0
        for entry in pycountry.countries:
            iso2 = entry.alpha_2
            code = _currency_code(iso2)
            defaults = {
                # common_name is what people actually call it: "South Korea",
                # not "Korea, Republic of".
                "name": (getattr(entry, "common_name", None) or entry.name)[:128],
                "iso3": entry.alpha_3,
                "numeric_code": entry.numeric,
                "phone_code": _phone_code(iso2),
                "flag_emoji": _flag(iso2),
                "currency": currencies.get(code) if code else None,
            }
            _, was_created = Country.objects.update_or_create(iso2=iso2, defaults=defaults)
            created += was_created
            updated += not was_created
        return f"{created} added, {updated} refreshed"

    def _seed_states(self) -> str:
        countries = {c.iso2: c for c in Country.objects.all()}
        created = updated = orphaned = 0
        for entry in pycountry.subdivisions:
            country = countries.get(entry.country_code)
            if country is None:
                orphaned += 1
                continue
            _, was_created = StateProvince.objects.update_or_create(
                country=country,
                code=entry.code[:10],
                defaults={"name": entry.name[:128], "kind": (entry.type or "")[:64]},
            )
            created += was_created
            updated += not was_created
        tail = f", {orphaned} skipped with no country" if orphaned else ""
        return f"{created} added, {updated} refreshed{tail}"
