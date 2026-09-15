"""Polling the feeds a body publishes, and turning entries into documents.

One thing this deliberately does not do: follow an entry's link and read the
page behind it. What is ingested is what the feed itself carries, because the
feed is the publication. Reading the linked page would mean parsing HTML, which
the corpus reader refuses on purpose, and it would turn a subscription into a
crawl.

The cost of that honesty is real and worth stating: most feeds carry a summary
rather than the whole article, so a feed document is short. It is still the
body's own words, dated and attributable, which is what a citation needs.
"""

from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone

import feedparser
import requests
from django.utils import timezone as dj_timezone

from appsettings.models import switched_on
from knowledge.geography import country_of, covered_patterns
from knowledge.models import Document, IngestionRun, Source
from knowledge.parsing import DocumentUnreadable
from knowledge.services import content_fingerprint, ingest_document

log = logging.getLogger(__name__)

#: Identifies us to the servers we poll. A publisher who wants to block a badly
#: behaved client can only do so if the client says who it is.
USER_AGENT = "MaatBot/1.0 (+https://maatverify.com; rumour verification)"

REQUEST_TIMEOUT = 20

#: The doors the scheduler knocks on. Uploads arrive by hand.
POLLED_DOORS = (Source.Door.FEED, Source.Door.API, Source.Door.PAGES)

#: After this many consecutive failures a source stops being polled on its
#: cadence and waits for someone to look at it. A feed that has been failing
#: for days is not going to fix itself by being asked more often.
FAILURE_LIMIT = 5


@dataclass
class Entry:
    """One item from a feed, reduced to what a document needs."""

    identifier: str
    title: str
    body: str
    published: datetime | None


def _text(value: str) -> str:
    """Feed summaries arrive as escaped HTML. Reduce them to readable prose."""
    text = html.unescape(value or "")
    text = re.sub(r"(?i)<br\s*/?>|</p>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"[ \t]+", " ", text).strip()


def _published(entry) -> datetime | None:
    parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if not parsed:
        return None
    return datetime(*parsed[:6], tzinfo=timezone.utc)


def read_entries(raw: bytes) -> list[Entry]:
    """Parse a feed body into entries, newest first as the feed gives them.

    Entries without a usable identifier are dropped rather than given one: a
    made-up identifier would make the same entry look new on every poll, and
    the corpus would fill with copies of one announcement.
    """
    parsed = feedparser.parse(raw)
    out: list[Entry] = []
    for entry in parsed.entries:
        identifier = (getattr(entry, "id", "") or getattr(entry, "link", "") or "").strip()
        title = _text(getattr(entry, "title", ""))
        if not identifier or not title:
            continue
        summary = _text(getattr(entry, "summary", "") or "")
        content = ""
        for block in getattr(entry, "content", []) or []:
            content = _text(block.get("value", ""))
            if content:
                break
        # The body is the title followed by whatever prose the feed carried.
        # The title is repeated inside the document on purpose: it is usually
        # the clearest statement of what happened, and a passage that carries
        # it is findable by the words people search with.
        body = "\n\n".join(part for part in (title, content or summary) if part)
        out.append(Entry(identifier=identifier[:1000], title=title[:500], body=body, published=_published(entry)))
    return out


def fetch(source: Source) -> tuple[int, bytes]:
    """Fetch a feed, asking the server not to send it if it has not changed.

    Returns (status, body). A 304 comes back with an empty body and means there
    is nothing to do.
    """
    headers = {"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml"}
    if source.http_etag:
        headers["If-None-Match"] = source.http_etag
    if source.http_last_modified:
        headers["If-Modified-Since"] = source.http_last_modified

    response = requests.get(source.address, headers=headers, timeout=REQUEST_TIMEOUT)
    if response.status_code == 304:
        return 304, b""
    response.raise_for_status()
    return response.status_code, response.content


def is_due(source: Source, *, now: datetime | None = None) -> bool:
    """Whether this source's cadence has elapsed.

    A source that has failed repeatedly is not due until somebody clears it,
    which is the difference between backing off and giving up quietly.
    """
    if not source.is_active or source.door not in POLLED_DOORS:
        return False
    if (source.schema or {}).get("lookup"):
        # An API asked on demand, when a claim needs a figure. Nothing to poll.
        return False
    if source.failure_count >= FAILURE_LIMIT:
        return False
    if source.last_polled_at is None:
        return True
    now = now or dj_timezone.now()
    return (now - source.last_polled_at).total_seconds() >= source.cadence_minutes * 60


def poll(source: Source) -> IngestionRun:
    """Poll one feed and ingest whatever it carries that we do not hold.

    Every poll is recorded, including the ones that found nothing, because
    "when did this last work" is the question a quiet source raises and it
    cannot be answered from the documents alone.
    """
    run = IngestionRun.objects.create(source=source)
    try:
        status, body = fetch(source)
    except Exception as exc:  # network, DNS, TLS, HTTP error
        return _failed(source, run, f"{exc.__class__.__name__}: {exc}")

    if status == 304:
        return _finished(source, run, seen=0, added=0, updated=0, chunks=0)

    entries = read_entries(body)
    if not entries:
        return _failed(source, run, "The feed parsed but carried no usable entries.")

    # Compiled once per poll, not once per entry.
    patterns = covered_patterns()
    added = chunks = 0
    for entry in entries:
        try:
            if _already_held(source, entry):
                continue
            # A national source files everything under its country. A global
            # feed is read for which covered country, if any, the story names.
            country = source.country or country_of(entry.body, patterns)
            document = ingest_document(
                source=source,
                filename=_filename(entry),
                data=entry.body.encode("utf-8"),
                country=country,
                published_at=entry.published.date() if entry.published else None,
                content_type="text/plain",
            )
            # The feed's own identifier is what makes the entry recognisable on
            # the next poll; the filename is only what the parser needed.
            Document.objects.filter(pk=document.pk).update(title=entry.title, url=entry.identifier)
            document.refresh_from_db(fields=["title", "url"])
            added += 1
            chunks += document.chunks.count()
        except DocumentUnreadable as exc:
            log.warning("feed entry unreadable (%s): %s", source.name, exc)
        except Exception as exc:  # one bad entry must not lose the whole poll
            log.warning("feed entry failed (%s): %s", source.name, exc)

    _remember_validators(source, body)
    return _finished(source, run, seen=len(entries), added=added, updated=0, chunks=chunks)


def _filename(entry: Entry) -> str:
    """A .txt name, because the body is prose the feed gave us, not a file."""
    stem = re.sub(r"[^a-z0-9]+", "-", entry.title.lower()).strip("-")[:80] or "entry"
    return f"{stem}.txt"


def _already_held(source: Source, entry: Entry) -> bool:
    """Whether this entry is already on the shelf, unchanged.

    Matched on the feed's identifier AND the content fingerprint, so a
    corrected announcement is ingested as a new version while an unchanged one
    is skipped. Without this every poll would mint a version of everything the
    feed still lists, which for an hourly poll is twenty-four copies a day.
    """
    return Document.active.filter(
        source=source,
        url=entry.identifier,
        fingerprint=content_fingerprint(entry.body.encode("utf-8")),
    ).exists()


def _remember_validators(source: Source, body: bytes) -> None:
    """Keep whatever lets the next request be conditional."""
    try:
        response = requests.head(source.address, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        source.http_etag = (response.headers.get("ETag") or "")[:300]
        source.http_last_modified = (response.headers.get("Last-Modified") or "")[:120]
    except Exception:
        # Not worth failing a good poll over. The next one is simply not
        # conditional, which costs a download and nothing else.
        source.http_etag = source.http_etag or ""
    del body


def _failed(source: Source, run: IngestionRun, message: str) -> IngestionRun:
    source.failure_count += 1
    source.last_error = message[:2000]
    source.last_polled_at = dj_timezone.now()
    source.save(update_fields=["failure_count", "last_error", "last_polled_at", "updated_at"])
    run.status = IngestionRun.Status.FAILED
    run.error = message[:2000]
    run.finished_at = dj_timezone.now()
    run.save(update_fields=["status", "error", "finished_at"])
    return run


def _finished(source: Source, run: IngestionRun, *, seen: int, added: int, updated: int, chunks: int) -> IngestionRun:
    source.failure_count = 0
    source.last_error = ""
    source.last_polled_at = dj_timezone.now()
    source.save(
        update_fields=[
            "failure_count",
            "last_error",
            "last_polled_at",
            "http_etag",
            "http_last_modified",
            "updated_at",
        ]
    )
    run.status = IngestionRun.Status.SUCCEEDED
    run.documents_seen = seen
    run.documents_added = added
    run.documents_updated = updated
    run.chunks_written = chunks
    run.finished_at = dj_timezone.now()
    run.save(
        update_fields=[
            "status",
            "documents_seen",
            "documents_added",
            "documents_updated",
            "chunks_written",
            "finished_at",
        ]
    )
    return run


def poll_due(*, force: bool = False) -> list[IngestionRun]:
    """Poll every source whose cadence has elapsed. Returns the runs it made.

    Feeds and APIs are polled by different readers and go through the same
    pipeline. Any one source failing is written on that source; the loop goes
    on to the next.

    A source belonging to a country switched off in Settings is not polled at
    all, forced or not. Switching a country off is how it stops costing
    anything; switching it on is how polling starts again.
    """
    from knowledge.connectors import poll_api
    from knowledge.pages import poll_pages

    readers = {Source.Door.FEED: poll, Source.Door.API: poll_api, Source.Door.PAGES: poll_pages}
    runs = []
    sources = Source.active.filter(switched_on(), is_active=True, door__in=POLLED_DOORS).exclude(schema__contains={"lookup": True})
    for source in sources:
        if not (force or is_due(source)):
            continue
        try:
            runs.append(readers[source.door](source))
        except Exception as exc:  # a reader must not take the loop down
            log.exception("polling %s raised: %s", source.slug, exc)
    return runs
