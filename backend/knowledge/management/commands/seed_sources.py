"""Load the source register into the database.

The register was written in the dashboard while there was no server behind it.
This moves it where it belongs: a source is a row, its documents are counted by
the database, and its health is whatever the last poll actually did.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from core.models import Country
from knowledge.models import Source

FIXTURE = Path(__file__).resolve().parent.parent.parent / "fixtures" / "register.json"


class Command(BaseCommand):
    help = "Create or update the configured sources from the register."

    def handle(self, *args, **options):
        rows = json.loads(FIXTURE.read_text())
        created = updated = 0
        for row in rows:
            country = Country.active.filter(iso2=row.get("country") or "").first()
            defaults = dict(
                name=row["name"],
                door=row["door"],
                address=row.get("address", ""),
                collection=row.get("collection", ""),
                subject=row.get("subject", ""),
                scope=row.get("scope", "general"),
                verification=row.get("verification", "listed"),
                logo_url=row.get("logoUrl", ""),
                brand=row.get("brand", ""),
                short=row.get("short", ""),
                country=country,
                cadence_minutes=row.get("cadenceMinutes", 360),
                is_active=row.get("isActive", True),
                schema=row.get("schema") or {},
                auth=row.get("auth") or {},
            )
            source, was_created = Source.objects.update_or_create(slug=row["id"], defaults=defaults)
            created += was_created
            updated += not was_created
            del source
        self.stdout.write(self.style.SUCCESS(f"{created} created, {updated} updated."))
