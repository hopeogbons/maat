"""The fourth door: an official body's own public pages, read as a good citizen.

Some of the bodies a country relies on most publish neither a feed nor an API.
A national emergency agency, a public broadcaster, a ministry: their word is
exactly what a rumour should be checked against, and the only way to read it
is from their pages. This module does that, under rules that are the point:

**Official bodies only.** Government agencies, ministries, regulators, public
broadcasters and the state news agency. Never a private outlet. Who qualifies
is decided in the register, not here.

**The site's rules first.** robots.txt is fetched before anything else and
obeyed to the letter, crawl-delay included. A robots file that cannot be read
(a server error) closes the door for that poll rather than opening it.

**Slowly, and identified.** One request at a time, a pause between requests to
the same host, and a User-Agent that says who is asking and why, so a body
that would rather we did not can say so.

**Whole articles, once.** Only pages that read as a complete article are kept,
with title, date and address. A page already held is never fetched again. Each
poll takes at most a small batch, so a backlog drains over days rather than
hammering a site in one night.

**Nothing from behind a login or a paywall.** Public pages, plainly.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from datetime import date
from urllib.parse import urldefrag, urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

import requests
from django.utils import timezone
from lxml import etree, html as lxml_html

from knowledge.connectors import normalise_date
from knowledge.geography import country_of
from knowledge.models import Document, IngestionRun, Source
from knowledge.parsing import DocumentUnreadable
from knowledge.services import ingest_document

log = logging.getLogger(__name__)

USER_AGENT = "MaatBot/1.0 (+https://maatverify.com; rumour verification)"
TIMEOUT = 20

#: Pause between two requests to the same host, unless robots.txt asks for more.
MIN_DELAY = 2.0
#: New articles taken per poll. A body's backlog is read over days, not at once.
MAX_NEW_PER_POLL = 20
#: Links considered from one listing page. Beyond this it is a site map, not news.
MAX_LISTING_LINKS = 300
#: Below this many characters a page is a stub, a listing or a menu, not an article.
#: A short official statement passes when the page also carries a date; a
#: longer text passes on length alone, since dates are the thing sites most
#: often forget to mark up.
MIN_ARTICLE_CHARS = 500
LONG_ARTICLE_CHARS = 1200
#: Bytes of an article page or file worth downloading.
MAX_PAGE_BYTES = 8 * 1024 * 1024

#: Paths that are never articles on any news site.
DEFAULT_EXCLUDE = (
    r"/tag/", r"/tags/", r"/category/", r"/categories/", r"/author/", r"/page/\d+", r"/feed/?$",
    r"/wp-json/", r"/wp-content/", r"/wp-admin/", r"/wp-login", r"\?s=", r"/search", r"/login",
    r"/signin", r"/register", r"/cart", r"/privacy", r"/terms", r"/sitemap", r"/contact", r"[?&](page|paged|start|offset)=\d+",
    r"/about", r"\.(jpe?g|png|gif|svg|webp|mp4|mp3|zip|css|js)(\?|$)",
)


@dataclass
class Rules:
    """What on the site counts as an article, from the source's schema."""

    listing: list[str]
    sitemaps: list[str]
    include: list[re.Pattern]
    exclude: list[re.Pattern]
    max_new: int = MAX_NEW_PER_POLL

    @classmethod
    def of(cls, source: Source) -> "Rules":
        schema = source.schema or {}
        listing = list(schema.get("listing") or []) or ([source.address] if source.address else [])
        return cls(
            listing=listing,
            sitemaps=list(schema.get("sitemaps") or []),
            include=[re.compile(p, re.IGNORECASE) for p in (schema.get("include") or [])],
            exclude=[re.compile(p, re.IGNORECASE) for p in (*DEFAULT_EXCLUDE, *(schema.get("exclude") or []))],
            max_new=int(schema.get("max_new") or MAX_NEW_PER_POLL),
        )

    def is_article_link(self, url: str, host: str) -> bool:
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or parts.netloc.lower().removeprefix("www.") != host:
            return False
        path = parts.path or "/"
        if path == "/" or any(p.search(url) for p in self.exclude):
            return False
        if self.include:
            return any(p.search(url) for p in self.include)
        # No include rule: an article is a page with a slug or an id in it, not
        # a section index. Query-string ids are how older sites address a story.
        if re.search(r"(^|&)(id|p|post|article|news_id|nid|itemid)=\d+", parts.query, re.IGNORECASE):
            return True
        last = path.rstrip("/").rsplit("/", 1)[-1]
        if len(last) < 6:
            return False
        return any(ch in last for ch in "-_") or any(ch.isdigit() for ch in last) or last.lower().endswith(
            (".pdf", ".html", ".htm", ".php", ".aspx")
        )


# --------------------------------------------------------------------------
# Manners: robots.txt and pacing
# --------------------------------------------------------------------------


@dataclass
class Host:
    """One site's rules and our last request to it, for the length of a poll."""

    root: str
    robots: RobotFileParser | None
    closed: bool = False  # robots.txt unreadable: nothing is fetched from here
    delay: float = MIN_DELAY
    last_request: float = field(default=0.0)

    @classmethod
    def read(cls, url: str) -> "Host":
        parts = urlsplit(url)
        root = urlunsplit((parts.scheme, parts.netloc, "", "", ""))
        parser = RobotFileParser()
        try:
            response = requests.get(f"{root}/robots.txt", headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT)
        except requests.RequestException as exc:
            log.warning("robots.txt unreachable for %s: %s", root, exc)
            return cls(root=root, robots=None, closed=True)
        if response.status_code >= 500:
            # The site is unwell; asking it for pages now would be the wrong reply.
            return cls(root=root, robots=None, closed=True)
        if response.status_code >= 400:
            # No robots file is the convention for "anything public is fine".
            parser.parse([])
            return cls(root=root, robots=parser)
        parser.parse(response.text.splitlines())
        delay = MIN_DELAY
        asked = parser.crawl_delay(USER_AGENT) or parser.crawl_delay("*")
        if asked:
            delay = max(delay, float(asked))
        return cls(root=root, robots=parser, delay=delay)

    def allows(self, url: str) -> bool:
        if self.closed or self.robots is None:
            return False
        return self.robots.can_fetch(USER_AGENT, url) and self.robots.can_fetch("*", url)

    def pace(self) -> None:
        wait = self.delay - (time.monotonic() - self.last_request)
        if wait > 0:
            time.sleep(wait)
        self.last_request = time.monotonic()


def _get(host: Host, url: str) -> requests.Response:
    host.pace()
    response = requests.get(
        url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5"},
        timeout=TIMEOUT, stream=True,
    )
    response.raise_for_status()
    if int(response.headers.get("Content-Length") or 0) > MAX_PAGE_BYTES:
        raise ValueError(f"{url} is larger than {MAX_PAGE_BYTES // (1024 * 1024)}MB")
    body = response.raw.read(MAX_PAGE_BYTES + 1, decode_content=True)
    if len(body) > MAX_PAGE_BYTES:
        raise ValueError(f"{url} is larger than {MAX_PAGE_BYTES // (1024 * 1024)}MB")
    response._content = body  # noqa: SLF001 - requests has no public setter for a streamed body
    return response


# --------------------------------------------------------------------------
# Finding articles
# --------------------------------------------------------------------------


def _clean(url: str) -> str:
    url, _fragment = urldefrag(url)
    parts = urlsplit(url)
    query = "&".join(p for p in parts.query.split("&") if p and not p.lower().startswith(("utm_", "fbclid", "gclid")))
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))


def article_links(page: bytes | str, base_url: str, rules: Rules) -> list[str]:
    """Every link on a listing page that reads as an article, in page order, once each."""
    try:
        tree = lxml_html.fromstring(page)
    except (etree.ParserError, ValueError):
        return []
    host = urlsplit(base_url).netloc.lower().removeprefix("www.")
    seen: set[str] = set()
    out: list[str] = []
    for href in tree.xpath("//a/@href"):
        url = _clean(urljoin(base_url, href.strip()))
        if url in seen or url == _clean(base_url) or not rules.is_article_link(url, host):
            continue
        seen.add(url)
        out.append(url)
        if len(out) >= MAX_LISTING_LINKS:
            break
    return out


_SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9", "news": "http://www.google.com/schemas/sitemap-news/0.9"}


def sitemap_links(xml: bytes, rules: Rules, host: str) -> tuple[list[tuple[str, str]], list[str]]:
    """(article urls with their lastmod, newest first) and (child sitemaps) from one sitemap."""
    try:
        root = etree.fromstring(xml, parser=etree.XMLParser(recover=True, huge_tree=True))
    except (etree.XMLSyntaxError, ValueError):
        return [], []
    if root is None:
        return [], []
    children = [loc.text.strip() for loc in root.xpath("//sm:sitemap/sm:loc", namespaces=_SITEMAP_NS) if loc.text]
    rows = []
    for node in root.xpath("//sm:url", namespaces=_SITEMAP_NS):
        loc = node.findtext("sm:loc", namespaces=_SITEMAP_NS)
        if not loc:
            continue
        url = _clean(loc.strip())
        if not rules.is_article_link(url, host):
            continue
        when = node.findtext("news:news/news:publication_date", namespaces=_SITEMAP_NS) or node.findtext(
            "sm:lastmod", namespaces=_SITEMAP_NS
        )
        rows.append((url, (when or "").strip()))
    rows.sort(key=lambda r: r[1], reverse=True)
    return rows, children


# --------------------------------------------------------------------------
# Reading one article
# --------------------------------------------------------------------------


@dataclass
class Article:
    url: str
    title: str
    text: str
    published: date | None

    @property
    def complete(self) -> bool:
        if not self.title or len(self.text) < MIN_ARTICLE_CHARS:
            return False
        return self.published is not None or len(self.text) >= LONG_ARTICLE_CHARS


def extract(page: bytes | str, url: str) -> Article | None:
    """The article on a page, or None when the page does not read as one.

    trafilatura does the hard part: telling the article from the navigation,
    the sidebar and the footer, and reading its title and date from the page's
    own metadata before guessing from the text.
    """
    import trafilatura

    try:
        # Dates come from the page's own markup only. The extensive search
        # guesses a date from any year it can find, and a guessed date on a
        # citation is worse than none.
        found = trafilatura.bare_extraction(
            page, url=url, with_metadata=True, include_comments=False, include_tables=True, favor_precision=True,
            date_extraction_params={"extensive_search": False, "original_date": True},
        )
    except Exception as exc:  # noqa: BLE001 - a broken page is that page's problem
        log.info("extraction failed for %s: %s", url, exc)
        return None
    if not found:
        return None
    get = (lambda k: getattr(found, k, None)) if not isinstance(found, dict) else found.get
    text = re.sub(r"\n{3,}", "\n\n", (get("text") or "").strip())
    title = (get("title") or "").strip()
    return Article(url=url, title=title[:500], text=text, published=normalise_date(get("date")))


# --------------------------------------------------------------------------
# The poll
# --------------------------------------------------------------------------


def poll_pages(source: Source) -> IngestionRun:
    """Read one body's pages: list, pick what is new, fetch a batch, keep the articles.

    Records a run either way and never raises; a failure is written on the
    source and the caller moves on.
    """
    run = IngestionRun.objects.create(source=source)
    rules = Rules.of(source)
    if not rules.listing and not rules.sitemaps:
        return _failed(source, run, "No listing page or sitemap is configured for this source.")

    host = Host.read(rules.listing[0] if rules.listing else rules.sitemaps[0])
    if host.closed:
        return _failed(source, run, f"robots.txt for {host.root} could not be read; nothing was fetched.")
    hostname = urlsplit(host.root).netloc.lower().removeprefix("www.")

    candidates: list[str] = []
    problems: list[str] = []
    for sitemap in rules.sitemaps:
        candidates.extend(_walk_sitemap(host, sitemap, rules, hostname, problems))
    for listing in rules.listing:
        if not host.allows(listing):
            problems.append(f"robots.txt disallows {listing}")
            continue
        try:
            candidates.extend(article_links(_get(host, listing).content, listing, rules))
        except Exception as exc:  # noqa: BLE001
            problems.append(f"{listing}: {exc.__class__.__name__}: {exc}")

    if not candidates and problems:
        return _failed(source, run, "; ".join(problems)[:2000])

    fresh = _unseen(source, list(dict.fromkeys(candidates)))[:rules.max_new]
    added = chunks = 0
    for url in fresh:
        if not host.allows(url):
            continue
        try:
            response = _get(host, url)
            document = _keep(source, url, response)
            if document is None:
                continue
            added += 1
            chunks += document.chunks.count()
        except DocumentUnreadable as exc:
            log.info("page unreadable (%s): %s", source.slug, exc)
        except Exception as exc:  # noqa: BLE001 - one bad page must not lose the batch
            log.warning("page failed (%s) %s: %s", source.slug, url, exc)

    # A poll that worked but tripped over one listing says so on the source,
    # without counting as a failure: the batch still came in.
    source.last_error = "; ".join(problems)[:2000] if problems else ""
    return _finished(source, run, seen=len(candidates), added=added, chunks=chunks)


def _walk_sitemap(host: Host, url: str, rules: Rules, hostname: str, problems: list[str], depth: int = 0) -> list[str]:
    if depth > 2 or not host.allows(url):
        return []
    try:
        rows, children = sitemap_links(_get(host, url).content, rules, hostname)
    except Exception as exc:  # noqa: BLE001
        problems.append(f"{url}: {exc.__class__.__name__}: {exc}")
        return []
    found = [u for u, _ in rows[:MAX_LISTING_LINKS]]
    # Child sitemaps newest-named first; three is plenty for what is new.
    for child in sorted(children, reverse=True)[:3]:
        if len(found) >= MAX_LISTING_LINKS:
            break
        found.extend(_walk_sitemap(host, child, rules, hostname, problems, depth + 1))
    return found


def _unseen(source: Source, urls: list[str]) -> list[str]:
    held = set(Document.active.filter(source=source, url__in=urls).values_list("url", flat=True))
    return [u for u in urls if u not in held]


def _keep(source: Source, url: str, response: requests.Response) -> Document | None:
    """Store the page as a document if it is an article, or the file if it is a PDF."""
    kind = (response.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    if kind == "application/pdf" or url.lower().endswith(".pdf"):
        document = ingest_document(
            source=source, filename=_filename(url.rsplit("/", 1)[-1] or "notice", ".pdf"), data=response.content,
            country=source.country, content_type="application/pdf",
        )
        Document.objects.filter(pk=document.pk).update(url=url[:1000])
        document.refresh_from_db(fields=["url"])
        return document

    article = extract(response.content, url)
    if article is None or not article.complete:
        return None
    body = f"{article.title}\n\n{article.text}"
    country = source.country or country_of(body)
    document = ingest_document(
        source=source, filename=_filename(article.title, ".txt"), data=body.encode("utf-8"),
        country=country, published_at=article.published, content_type="text/plain",
    )
    Document.objects.filter(pk=document.pk).update(title=article.title[:500], url=url[:1000])
    document.refresh_from_db(fields=["title", "url"])
    return document


def _filename(title: str, suffix: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:80] or "page"
    return f"{stem}{suffix}"


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
    source.last_polled_at = timezone.now()
    source.save(update_fields=["failure_count", "last_error", "last_polled_at", "updated_at"])
    run.status = IngestionRun.Status.SUCCEEDED
    run.documents_seen = seen
    run.documents_added = added
    run.chunks_written = chunks
    run.finished_at = timezone.now()
    run.save(update_fields=["status", "documents_seen", "documents_added", "chunks_written", "finished_at"])
    return run
