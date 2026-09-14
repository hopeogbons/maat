"""Seed the ISO 4217 currencies and the IANA time zones.

Runs before the country sync, which links each country to its currency.

Both catalogues come from data already on the machine: pycountry carries the ISO
register, Babel carries the CLDR symbols and minor units, and the time zones are
read from Python's own tz database. Nothing is fetched, so the command works on a
box with no outbound network and gives the same answer every time.

Safe to run again. Rows are matched on their code and updated in place, so a
currency that has already been pointed at by a country is never deleted and
recreated underneath it.
"""

from __future__ import annotations

import zoneinfo

import functools

import pycountry
from babel.numbers import get_currency_precision, get_currency_symbol, get_territory_currencies
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Currency, TimeZone


@functools.lru_cache(maxsize=1)
def _home_territory() -> dict[str, str]:
    """Which country each currency belongs to, for asking after its symbol.

    A symbol only exists inside a locale. Ask an English speaker in the United
    States what the naira looks like and CLDR answers "NGN"; ask one in Nigeria
    and it answers the naira sign. So each currency is asked about at home.
    """
    home: dict[str, str] = {}
    for country in pycountry.countries:
        for code in get_territory_currencies(country.alpha_2, tender=True):
            home.setdefault(code, country.alpha_2)
    return home


def _symbol(code: str) -> str:
    """The currency's own symbol, or nothing when it has no glyph of its own."""
    territory = _home_territory().get(code)
    for locale in ([f"en_{territory}"] if territory else []) + ["en"]:
        try:
            symbol = get_currency_symbol(code, locale=locale)
        except Exception:  # noqa: BLE001 - an unknown locale is not an error here
            continue
        if symbol and symbol != code:
            return symbol
    return ""


def _minor_units(code: str) -> int | None:
    try:
        return get_currency_precision(code)
    except Exception:  # noqa: BLE001 - an unknown code simply has no precision
        return None


class Command(BaseCommand):
    help = "Seed ISO 4217 currencies and IANA time zones. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        currencies = self._seed_currencies()
        zones = self._seed_timezones()
        self.stdout.write(
            self.style.SUCCESS(f"Currencies: {currencies}. Time zones: {zones}.")
        )

    def _seed_currencies(self) -> str:
        created = updated = 0
        for entry in pycountry.currencies:
            code = entry.alpha_3
            defaults = {
                "name": entry.name[:128],
                "numeric": getattr(entry, "numeric", "") or "",
                "minor_units": _minor_units(code),
                "symbol": _symbol(code)[:8],
            }
            _, was_created = Currency.objects.update_or_create(code=code, defaults=defaults)
            created += was_created
            updated += not was_created
        return f"{created} added, {updated} refreshed"

    def _seed_timezones(self) -> str:
        created = 0
        known = set(TimeZone.objects.values_list("name", flat=True))
        new = sorted(name for name in zoneinfo.available_timezones() if name not in known)
        TimeZone.objects.bulk_create([TimeZone(name=name) for name in new], batch_size=500)
        created += len(new)
        return f"{created} added, {len(known)} already present"
