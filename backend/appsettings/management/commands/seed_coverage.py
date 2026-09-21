"""Cover every country the register names, switched on.

    manage.py seed_coverage

Run by the seed scripts after the register, never by the deploy hook: on a
live install coverage is a decision staff make on the Settings page, and a
deploy must not make it for them. After a reset, though, the decision has
already been made once, and the register is the record of it: a register with
Nigerian and Kenyan sources is a register for an install that answers for
Nigeria and Kenya. This puts that back.

A country dropped from Settings on purpose is soft-deleted, not gone, and is
left alone here. One switched off on purpose is left off.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from appsettings.models import CountryCoverage
from core.models import Country

REGISTER = Path(__file__).resolve().parents[3] / "knowledge" / "fixtures" / "register.json"


class Command(BaseCommand):
    help = "Add coverage, switched on, for every country the register has sources for."

    def handle(self, *args, **options):
        codes = sorted({row["country"] for row in json.loads(REGISTER.read_text()) if row.get("country")})
        added = kept = 0
        for iso2 in codes:
            country = Country.active.filter(iso2=iso2).first()
            if country is None:
                self.stderr.write(f"{iso2}: not in the catalogue; seed the catalogues first.")
                continue
            _, created = CountryCoverage.objects.get_or_create(
                country=country, defaults={"is_active": True, "note": "Restored from the register."}
            )
            added += created
            kept += not created
        self.stdout.write(self.style.SUCCESS(f"Coverage: {added} added, {kept} already decided."))
