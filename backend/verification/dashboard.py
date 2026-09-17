"""What the dashboard's front page says, counted from the record.

Every figure here is a count over real rows, scoped the way the rest of the
dashboard is scoped: documents and sources of countries switched on, and
rumours as they were raised. Nothing is estimated. A period with nothing in
it shows zero, which is the truthful shape of a young corpus.
"""

from __future__ import annotations

from collections import Counter
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from appsettings.models import switched_on
from knowledge.models import Document, Source
from verification.models import Rumour, Turn, Verdict

RANGES = {7, 30, 90}
TOP_SOURCES = 5
LATEST_RUMOURS = 10
VERDICT_ORDER = (Verdict.VERIFIED, Verdict.UNVERIFIED, Verdict.INSUFFICIENT)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        try:
            days = int(request.query_params.get("days", 7))
        except ValueError:
            days = 7
        days = days if days in RANGES else 7
        now = timezone.now()
        start = now - timedelta(days=days)
        before = start - timedelta(days=days)

        rumours = Rumour.active.filter(first_seen_at__gte=start)
        earlier = Rumour.active.filter(first_seen_at__gte=before, first_seen_at__lt=start)
        cited = Q(verdict__in=[Verdict.VERIFIED, Verdict.UNVERIFIED])

        shown = Document.active.filter(switched_on(), is_current=True)
        by_verdict = Counter(rumours.values_list("verdict", flat=True))

        return Response(
            {
                "days": days,
                "weighed": rumours.count(),
                "weighedBefore": earlier.count(),
                "cited": rumours.filter(cited).count(),
                "citedBefore": earlier.filter(cited).count(),
                "documents": shown.filter(fetched_at__gte=start).count(),
                "documentsBefore": shown.filter(fetched_at__gte=before, fetched_at__lt=start).count(),
                "verdicts": [by_verdict.get(v, 0) for v in VERDICT_ORDER],
                # Publication is the rumour's status: enough different people raised
                # it and it went public. Counted on the rumours themselves.
                "published": Rumour.active.filter(status=Rumour.Status.PUBLISHED, last_seen_at__gte=start).count(),
                "activity": _activity(rumours, start, days),
                "topSources": _top_sources(shown),
                "latest": _latest(),
                # How rumours reach Ma'at. Only the widget exists; it is counted, not estimated.
                "channels": {"messages": Turn.objects.filter(speaker=Turn.Speaker.VISITOR, created_at__gte=start).count()},
            }
        )


def _activity(rumours, start, days: int) -> list[dict]:
    """One row a day, oldest first, every day present even when nothing happened."""
    per_day: dict[str, Counter] = {}
    for seen, verdict in rumours.values_list("first_seen_at", "verdict"):
        per_day.setdefault(timezone.localdate(seen).isoformat(), Counter())[verdict] += 1
    rows = []
    first = timezone.localdate(start) + timedelta(days=1)
    for offset in range(days):
        day = (first + timedelta(days=offset)).isoformat()
        counts = per_day.get(day, Counter())
        rows.append({"date": day, **{v: counts.get(v, 0) for v in VERDICT_ORDER}})
    return rows


def _top_sources(shown) -> list[dict]:
    """The bodies holding most of what Ma'at can cite, and each one's share of it."""
    total = shown.count()
    sources = (
        Source.active.filter(switched_on())
        .annotate(held=Count("documents", filter=Q(documents__deleted_at__isnull=True, documents__is_current=True)))
        .filter(held__gt=0)
        .select_related("country")
        .order_by("-held", "name")[:TOP_SOURCES]
    )
    return [
        {
            "id": s.slug,
            "name": s.name,
            "short": s.short,
            "logoUrl": s.logo_url,
            "brand": s.brand,
            "country": s.country.iso2 if s.country_id else "",
            "documents": s.held,
            "share": round(100 * s.held / total) if total else 0,
        }
        for s in sources
    ]


def _latest() -> list[dict]:
    """The rumours most recently raised, with the body the verdict rests on."""
    rows = Rumour.active.select_related("country").order_by("-last_seen_at")[:LATEST_RUMOURS]
    out = []
    for rumour in rows:
        top = rumour.evidence.select_related("chunk__document__source").order_by("-score").first()
        out.append(
            {
                "id": str(rumour.id),
                "statement": rumour.statement,
                "verdict": rumour.verdict,
                "confidence": rumour.confidence,
                "mentions": rumour.mention_count,
                "reporters": rumour.reporter_count,
                "status": rumour.status,
                "country": rumour.country.iso2 if rumour.country_id else "",
                "lastSeen": rumour.last_seen_at.isoformat(),
                "source": top.chunk.document.source.name if top else "",
            }
        )
    return out
