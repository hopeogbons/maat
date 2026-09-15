"""One connector for every API, driven by a schema on the source.

An API source stores two things beside its address: how to authenticate, and
where in its response the items and their fields live. This module turns those
into a request and reads the response by the schema. Adding an API is a row
with a schema, not a module with an adapter.

Three rules keep it honest.

**Nothing is mandatory.** An empty auth block sends a plain request. A field
whose path resolves nowhere is null. A source with no schema is fetched and
sampled but yields no items, which is the state a new source is in while its
schema is being written against the sample.

**Failures are the source's, not the batch's.** One API being down, slow, or
reshaped is recorded on that source and the next source is polled. Nothing here
raises past `poll_api`.

**The sample is the truth.** On the first successful fetch, a trimmed copy of
the real response is kept on the source. The schema is then written against
what the API actually returns rather than what its documentation says, which
is how a path stays right when the two disagree.
"""

from __future__ import annotations

import html
import json
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone as dt_timezone
from email.utils import parsedate_to_datetime
from typing import Any

import requests
from django.utils import timezone

from knowledge.models import Document, IngestionRun, Source
from knowledge.parsing import DocumentUnreadable
from knowledge.services import content_fingerprint, ingest_document

log = logging.getLogger(__name__)

USER_AGENT = "MaatBot/1.0 (+https://maatverify.com; rumour verification)"
TIMEOUT = 20

#: How much of a response is kept as the sample. Enough to see the shape of
#: several items, not enough to store the dataset twice.
#:
#: Lists are trimmed harder the deeper they sit. The top-level list is the
#: items, and three of those show the shape. A list inside an item (a dataset's
#: resources, an article's tags) is bulk, and one entry shows its shape just as
#: well. Long strings are cut too: a schema needs to know a field is prose,
#: not read the prose.
SAMPLE_ITEMS = 3
SAMPLE_NESTED_ITEMS = 1
SAMPLE_STRING = 200
SAMPLE_BYTES = 16_000


# --------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------


def build_request(source: Source) -> tuple[dict[str, str], dict[str, str], tuple[str, str] | None]:
    """Headers, query parameters and basic-auth pair for this source.

    Built from whatever the auth block holds. A type with a missing credential
    degrades to an unauthenticated request rather than an error: the server
    will say 401 if it minds, and that is a clearer failure than one we invent.
    """
    auth = source.auth or {}
    kind = (auth.get("type") or "none").lower()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params: dict[str, str] = dict((source.schema or {}).get("query") or {})
    basic: tuple[str, str] | None = None

    if kind == "api_key" and auth.get("key"):
        name = auth.get("name") or "X-Api-Key"
        if (auth.get("in") or "header").lower() == "query":
            params[name] = auth["key"]
        else:
            headers[name] = auth["key"]
    elif kind == "bearer" and auth.get("token"):
        headers["Authorization"] = f"Bearer {auth['token']}"
    elif kind == "basic" and (auth.get("username") or auth.get("password")):
        basic = (auth.get("username") or "", auth.get("password") or "")

    return headers, params, basic


# --------------------------------------------------------------------------
# Reading by path
# --------------------------------------------------------------------------


def resolve(data: Any, path: str | list[str] | None) -> Any:
    """Follow a dotted path into JSON; try each fallback in turn; None if none lands.

    "data.results" walks two keys. "items.0.title" indexes a list. An empty
    path means the value itself, which is how a root-level array is named.
    """
    if path is None:
        return None
    if isinstance(path, list):
        for candidate in path:
            found = resolve(data, candidate)
            if found is not None:
                return found
        return None
    if path == "":
        return data
    current = data
    for step in str(path).split("."):
        if isinstance(current, dict):
            current = current.get(step)
        elif isinstance(current, list) and step.isdigit():
            index = int(step)
            current = current[index] if index < len(current) else None
        else:
            return None
        if current is None:
            return None
    return current


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    text = html.unescape(str(value))
    text = re.sub(r"(?i)<br\s*/?>|</p>|</h\d>|</li>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip() or None


# --------------------------------------------------------------------------
# Dates
# --------------------------------------------------------------------------

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S.%fZ",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %B %Y",
    "%d %b %Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%Y-%m",
    "%Y",
)


def normalise_date(value: Any) -> date | None:
    """Whatever an API calls a date, as a date. None when it is not one.

    Handles ISO 8601 with or without time and offset, RFC 2822 as feeds use,
    epoch seconds and milliseconds, year-month, bare years, and the common
    day-first and month-first spellings. A value that matches nothing is
    recorded as unknown rather than guessed: an invented date on a citation is
    worse than no date.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        seconds = value / 1000 if value > 1e11 else value
        try:
            return datetime.fromtimestamp(seconds, tz=dt_timezone.utc).date()
        except (OverflowError, OSError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        pass
    try:
        return parsedate_to_datetime(text).date()
    except (TypeError, ValueError, IndexError):
        pass
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    if re.fullmatch(r"\d{4}", text):
        return date(int(text), 1, 1)
    return None


# --------------------------------------------------------------------------
# Items
# --------------------------------------------------------------------------


@dataclass
class Item:
    title: str | None
    body: str | None
    date: date | None
    link: str | None

    @property
    def usable(self) -> bool:
        """Something to store and something to recognise it by next time."""
        return bool(self.title or self.body) and bool(self.link or self.title)


def read_items(payload: Any, schema: dict) -> list[Item]:
    """Every item the schema can find in the response, fields null where absent."""
    fields = (schema or {}).get("fields") or {}
    if not fields:
        return []
    rows = resolve(payload, (schema or {}).get("items", ""))
    if isinstance(rows, dict):
        rows = [rows]
    if not isinstance(rows, list):
        return []
    items = []
    for row in rows:
        items.append(
            Item(
                title=_as_text(resolve(row, fields.get("title"))),
                body=_as_text(resolve(row, fields.get("body"))),
                date=normalise_date(resolve(row, fields.get("date"))),
                link=_as_text(resolve(row, fields.get("link"))),
            )
        )
    return items


def _sample_of(payload: Any) -> Any:
    """The response with its shape kept and its bulk dropped, then size-capped.

    The first list met on the way down is treated as the items and keeps a
    few entries; every list below that keeps one. Strings are cut to a preview.
    The result reads as the real JSON shape, which is what writing a schema
    against it needs, at a fraction of the size.
    """

    def trim(node: Any, *, lists_seen: int = 0) -> Any:
        if isinstance(node, list):
            keep = SAMPLE_ITEMS if lists_seen == 0 else SAMPLE_NESTED_ITEMS
            return [trim(n, lists_seen=lists_seen + 1) for n in node[:keep]]
        if isinstance(node, dict):
            return {k: trim(v, lists_seen=lists_seen) for k, v in node.items()}
        if isinstance(node, str) and len(node) > SAMPLE_STRING:
            return node[:SAMPLE_STRING] + "…"
        return node

    trimmed = trim(payload)
    encoded = json.dumps(trimmed, ensure_ascii=False)
    if len(encoded) > SAMPLE_BYTES:
        return {"_truncated": True, "_preview": encoded[:SAMPLE_BYTES]}
    return trimmed


# --------------------------------------------------------------------------
# Fetch and poll
# --------------------------------------------------------------------------


def fetch(source: Source) -> Any:
    """GET the source's address with its auth and query, as parsed JSON."""
    headers, params, basic = build_request(source)
    response = requests.get(source.address, headers=headers, params=params, auth=basic, timeout=TIMEOUT)
    response.raise_for_status()
    try:
        return response.json()
    except ValueError as exc:
        raise ValueError(f"not JSON ({response.headers.get('Content-Type', 'unknown type')})") from exc


def poll_api(source: Source) -> IngestionRun:
    """Fetch one API source, sample it if new, and ingest what the schema finds.

    Records a run either way. Never raises: whatever goes wrong is written on
    the run and the source, and the caller moves to the next source.
    """
    run = IngestionRun.objects.create(source=source)
    try:
        payload = fetch(source)
    except Exception as exc:  # network, auth, HTTP, not-JSON
        log.warning("api source %s failed: %s", source.slug, exc)
        return _failed(source, run, f"{exc.__class__.__name__}: {exc}")

    if source.response_sample is None:
        source.response_sample = _sample_of(payload)
        source.response_sample_at = timezone.now()
        source.save(update_fields=["response_sample", "response_sample_at", "updated_at"])

    if not (source.schema or {}).get("fields"):
        # Fetched and sampled, which is all a source without a schema can do.
        # Succeeded, with nothing added, is the truthful record of that.
        return _finished(source, run, seen=0, added=0, chunks=0)

    items = read_items(payload, source.schema)
    added = chunks = 0
    for item in items:
        if not item.usable:
            continue
        try:
            body = "\n\n".join(part for part in (item.title, item.body) if part)
            identifier = item.link or item.title or ""
            if _already_held(source, identifier, body):
                continue
            document = ingest_document(
                source=source,
                filename=_filename(item.title or identifier),
                data=body.encode("utf-8"),
                country=source.country,
                published_at=item.date,
                content_type="text/plain",
            )
            Document.objects.filter(pk=document.pk).update(title=(item.title or identifier)[:500], url=(item.link or "")[:1000])
            added += 1
            chunks += document.chunks.count()
        except DocumentUnreadable as exc:
            log.info("api item skipped (%s): %s", source.slug, exc)
        except Exception as exc:  # one bad item must not lose the rest
            log.warning("api item failed (%s): %s", source.slug, exc)

    return _finished(source, run, seen=len(items), added=added, chunks=chunks)


def _already_held(source: Source, identifier: str, body: str) -> bool:
    return Document.active.filter(
        source=source, url=identifier[:1000], fingerprint=content_fingerprint(body.encode("utf-8"))
    ).exists()


def _filename(title: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:80] or "item"
    return f"{stem}.txt"


def _failed(source: Source, run: IngestionRun, message: str) -> IngestionRun:
    source.failure_count += 1
    source.last_error = message[:2000]
    source.last_polled_at = timezone.now()
    source.save(update_fields=["failure_count", "last_error", "last_polled_at", "updated_at"])
    run.status = IngestionRun.Status.FAILED
    run.error = message[:2000]
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "error", "finished_at"])
    return run


def _finished(source: Source, run: IngestionRun, *, seen: int, added: int, chunks: int) -> IngestionRun:
    source.failure_count = 0
    source.last_error = ""
    source.last_polled_at = timezone.now()
    source.save(update_fields=["failure_count", "last_error", "last_polled_at", "updated_at"])
    run.status = IngestionRun.Status.SUCCEEDED
    run.documents_seen = seen
    run.documents_added = added
    run.chunks_written = chunks
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "documents_seen", "documents_added", "chunks_written", "finished_at"])
    return run
