"""The settings the dashboard edits, and the countries Ma'at covers."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from appsettings.models import AppSetting, CountryCoverage
from core.models import Country

#: Editable from the dashboard. Everything else on the row is recorded rather
#: than chosen, and is not exposed for editing here.
EDITABLE = (
    "confidence_gate",
    "mentions_before_publish",
    "max_followup_questions",
    "questions_per_visitor_per_hour",
    "daily_question_cap",
    "raw_text_retention_days",
)


def _coverage_payload(row: CountryCoverage) -> dict:
    return {
        "id": str(row.id),
        "iso2": row.country.iso2,
        "name": row.country.name,
        "flag": row.country.flag_emoji,
        "isActive": row.is_active,
        "note": row.note,
    }


def _settings_payload() -> dict:
    row = AppSetting.current()
    return {
        "settings": {name: getattr(row, name) for name in EDITABLE},
        "countries": [_coverage_payload(c) for c in CountryCoverage.active.select_related("country")],
    }


class SettingsView(APIView):
    """GET everything the settings page shows; PATCH the numbers."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(_settings_payload())

    def patch(self, request: Request) -> Response:
        row = AppSetting.current()
        for name in EDITABLE:
            if name in request.data:
                setattr(row, name, request.data[name])
        try:
            row.full_clean()
        except Exception as exc:  # validation, reported rather than 500'd
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        row.save()
        return Response(_settings_payload())


class CoverageView(APIView):
    """Add a country, change how far along it is, or drop it."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        iso2 = (request.data.get("iso2") or "").strip().upper()
        country = Country.active.filter(iso2=iso2).first()
        if country is None:
            return Response({"detail": f"No country with the code {iso2}."}, status=status.HTTP_400_BAD_REQUEST)
        if CountryCoverage.active.filter(country=country).exists():
            return Response({"detail": f"{country.name} is already on the list."}, status=status.HTTP_409_CONFLICT)

        # Dropping a country soft-deletes its row, and the one-to-one constraint
        # still counts it, so adding the same country again has to revive the
        # old row rather than insert a second. Creating blindly raised an
        # IntegrityError that reached the caller as a 500.
        row = CountryCoverage.objects.filter(country=country).first()
        if row is not None:
            row.restore()
            row.is_active = False
            row.note = (request.data.get("note") or "")[:300]
            row.save(update_fields=["is_active", "note", "updated_at"])
        else:
            # Never active on creation, whatever the caller asks for.
            CountryCoverage.objects.create(country=country, note=(request.data.get("note") or "")[:300])
        return Response(_settings_payload(), status=status.HTTP_201_CREATED)

    def patch(self, request: Request, iso2: str) -> Response:
        row = CountryCoverage.active.filter(country__iso2=iso2.upper()).first()
        if row is None:
            return Response({"detail": "Not covered."}, status=status.HTTP_404_NOT_FOUND)
        if "isActive" in request.data:
            row.is_active = bool(request.data["isActive"])
        if "note" in request.data:
            row.note = (request.data["note"] or "")[:300]
        row.save(update_fields=["is_active", "note", "updated_at"])
        return Response(_settings_payload())

    def delete(self, request: Request, iso2: str) -> Response:
        row = CountryCoverage.active.filter(country__iso2=iso2.upper()).first()
        if row is None:
            return Response({"detail": "Not covered."}, status=status.HTTP_404_NOT_FOUND)
        row.delete()
        return Response(_settings_payload())
