"""The upload door, for staff.

Documents arriving by hand. The other two doors, feeds and public APIs, are
polled on a schedule and do not come through here.
"""

from __future__ import annotations

import logging

from django.db.models import Count, Q
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.embeddings import EmbeddingUnavailable
from appsettings.models import switched_on
from core.models import Country
from knowledge.feeds import poll_now
from knowledge.models import Document, Source
from knowledge.parsing import SUPPORTED_EXTENSIONS, DocumentUnreadable, is_supported
from knowledge.services import ingest_document

logger = logging.getLogger(__name__)

#: A published circular is a few hundred kilobytes. The cap is here so one
#: mistaken upload cannot hold a worker for minutes and bill for thousands of
#: embeddings, not because larger documents are unreasonable in principle.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024



def _document_payload(document: Document) -> dict:
    return {
        "id": str(document.id),
        "title": document.title,
        "filename": document.identifier,
        "source": document.source.name,
        # Enough for the publisher's mark beside the document: its logo when it
        # has one, its short name and colour for the monogram when it has not.
        "sourceShort": document.source.short,
        "sourceLogo": document.source.logo_url,
        "sourceBrand": document.source.brand,
        "country": document.country.iso2 if document.country_id else "",
        "publishedAt": document.published_at.isoformat() if document.published_at else "",
        "version": document.version,
        "chunks": document.chunks.count(),
        "bytes": document.byte_size,
        "isPublic": document.is_public,
        "status": "ready",
    }


class DocumentsView(APIView):
    """GET the shelf, POST one file onto it."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get(self, request: Request) -> Response:
        documents = (
            Document.active.filter(switched_on(), is_current=True)
            .select_related("source", "country")
            .order_by("-published_at", "-created_at")[:500]
        )
        return Response({"documents": [_document_payload(d) for d in documents]})

    def post(self, request: Request) -> Response:
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "No file was sent."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > MAX_UPLOAD_BYTES:
            return Response(
                {"detail": f"That file is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)}MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        if not is_supported(upload.name):
            return Response(
                {"detail": f"Ma’at reads {', '.join(e[1:].upper() for e in SUPPORTED_EXTENSIONS)}."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        source = Source.active.filter(pk=request.data.get("source")).first()
        if source is None:
            return Response(
                {"detail": "Say which body published this. Every citation names one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        iso2 = (request.data.get("country") or "").strip().upper()
        country = Country.active.filter(iso2=iso2).first() if iso2 else None
        if iso2 and country is None:
            return Response({"detail": f"No country with the code {iso2}."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            document = ingest_document(
                source=source,
                filename=upload.name,
                data=upload.read(),
                country=country,
                is_public=str(request.data.get("isPublic", "")).lower() in {"1", "true", "yes", "on"},
                content_type=upload.content_type or "",
                user=request.user,
            )
        except DocumentUnreadable as exc:
            # The uploader's problem, and a fixable one: say what is wrong with
            # the file rather than returning a bare failure.
            return Response({"detail": str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        except EmbeddingUnavailable:
            # Ours, not theirs, and nothing was written. Whatever this document
            # said before, it still says.
            return Response(
                {"detail": "The model provider could not be reached, so nothing was changed. Try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(_document_payload(document), status=status.HTTP_201_CREATED)


#: A source is failing once it has missed this many polls in a row. One bad
#: night is not a fault; five is.
FAILING_AFTER = 3


def _health(source: Source) -> str:
    """What the last poll actually did, never a stored opinion.

    Health is derived rather than recorded so it cannot drift from the truth.
    A source claiming to be healthy while nothing has ever contacted it is the
    most misleading thing a monitoring page can show.
    """
    if not source.is_active:
        return "paused"
    if source.failure_count >= FAILING_AFTER:
        return "failing"
    if source.last_polled_at is None:
        return "never"
    return "failing" if source.failure_count else "ok"


def _source_payload(source: Source, documents: int) -> dict:
    return {
        "id": str(source.id),
        "slug": source.slug,
        "name": source.name,
        "short": source.short,
        "door": source.door,
        "address": source.address,
        "collection": source.collection,
        "subject": source.subject,
        "scope": source.scope,
        "verification": source.verification,
        "logoUrl": source.logo_url,
        "brand": source.brand,
        "country": source.country.iso2 if source.country_id else "",
        "cadenceMinutes": source.cadence_minutes,
        "isActive": source.is_active,
        "lastPolledAt": source.last_polled_at.isoformat() if source.last_polled_at else "",
        "documents": documents,
        "health": _health(source),
        "lastError": source.last_error,
        # Auth is described, never disclosed: the type and which credential
        # fields are set, so the form can show a padlock without holding a key.
        "auth": _auth_summary(source.auth or {}),
        "schema": source.schema or {},
        "hasSample": source.response_sample is not None,
        "sampledAt": source.response_sample_at.isoformat() if source.response_sample_at else "",
    }


def _auth_summary(auth: dict) -> dict:
    kind = (auth.get("type") or "none").lower()
    present = [k for k in ("key", "token", "username", "password") if auth.get(k)]
    return {"type": kind, "configured": [f"{k}: set" for k in present], "name": auth.get("name", ""), "in": auth.get("in", "")}


class SourcesView(APIView):
    """The register. Every figure on it is counted, not stored."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        sources = (
            Source.active.filter(switched_on())
            .select_related("country")
            .annotate(document_count=Count("documents", filter=Q(documents__deleted_at__isnull=True, documents__is_current=True)))
            .order_by("name", "country__name")
        )
        return Response({"sources": [_source_payload(s, s.document_count) for s in sources]})


class SourceRefreshView(APIView):
    """Pull from one source now, without waiting for its cadence.

    Run in the request rather than handed to the poller, because the person
    who pressed the button is watching: the answer is what the pull did, not
    that it was queued. A source whose site is slow will hold the request for
    as long as its reader takes, which is the honest cost of asking.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, slug: str) -> Response:
        source = Source.active.filter(slug=slug).first()
        if source is None:
            return Response({"detail": "No such source."}, status=status.HTTP_404_NOT_FOUND)
        try:
            run = poll_now(source)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001 - the reader's failure is the answer
            logger.exception("manual refresh of %s failed", source.slug)
            return Response(
                {"detail": f"The pull failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY
            )

        source.refresh_from_db()
        documents = Document.active.filter(source=source, is_current=True).count()
        return Response(
            {
                "source": _source_payload(source, documents),
                "run": {
                    "status": run.status,
                    "seen": run.documents_seen,
                    "added": run.documents_added,
                    "passages": run.chunks_written,
                    "error": run.error,
                },
            }
        )
