"""Finding the best way into a site, so the register never guesses.

Given a body's address, this asks the site itself what it offers, in the order
Ma'at prefers to use it: a public API, then a feed, then its pages. Each thing
found is verified by actually reading it, so "has a feed" means a feed that
parsed and carried entries, not a link that happened to be there.

The result is a recommendation and the exact configuration to store, which is
how a source enters the register already proven rather than hoped for.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from urllib.parse import urljoin, urlsplit, urlunsplit

import feedparser
import requests
from lxml import etree, html as lxml_html

from knowledge.pages import USER_AGENT, Host, Renderer, Rules, article_links, extract, sitemap_links

TIMEOUT = 25

#: Where a body keeps its news when the home page is a brochure. Tried when the
#: site offers no API and no feed, to find the listing worth reading pages from.
NEWS_PATHS = (
    "/news/", "/news", "/press-releases/", "/press-release/", "/press/", "/media/", "/newsroom/", "/news-room/",
    "/media-centre/", "/media-center/", "/news-center/", "/news-centre/", "/category/news/", "/updates/",
    "/latest-news/", "/news-and-events/", "/news-events/", "/publications/", "/blog/", "/press-statements/",
)

#: Where feeds live when a site does not announce them. WordPress, Joomla,
#: Drupal and the common static generators between them cover most public
#: bodies' sites in the region.
FEED_PATHS = (
    "/feed/", "/feed", "/rss", "/rss/", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml",
    "/?feed=rss2", "/index.php?format=feed&type=rss", "/index.php?option=com_content&view=featured&format=feed&type=rss",
    "/news/feed/", "/news/rss", "/blog/feed/", "/category/news/feed/", "/press-release/feed/", "/press-releases/feed/",
)
SITEMAP_PATHS = ("/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap-news.xml", "/news-sitemap.xml", "/post-sitemap.xml")
WP_POSTS = "/wp-json/wp/v2/posts?per_page=3&_fields=id,date,link,title,excerpt,content"


@dataclass
class Finding:
    url: str
    final_url: str = ""
    reachable: bool = False
    robots_allows: bool | None = None
    crawl_delay: float | None = None
    feeds: list[dict] = field(default_factory=list)  # {url, entries, full_text}
    wp_api: str = ""
    wp_posts_seen: int = 0
    sitemaps: list[str] = field(default_factory=list)
    listing_links: int = 0
    trial_article: dict | None = None  # {url, title, chars, date}
    listing: str = ""  # the page worth reading articles from, when the door is pages
    door: str = "none"
    schema: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def as_json(self) -> str:
        return json.dumps(asdict(self), indent=1, ensure_ascii=False)


#: Set for the length of one probe when the site is to be read through a browser.
_RENDERER: Renderer | None = None


def _get(url: str, accept: str = "*/*") -> requests.Response | None:
    if _RENDERER is not None and "html" in accept:
        try:
            final, html = _RENDERER.html(url)
        except Exception:  # noqa: BLE001 - a page the browser cannot open is a page we cannot read
            return None
        response = requests.Response()
        response.status_code = 200
        response._content = html.encode("utf-8")  # noqa: SLF001
        response.url = final
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        return response
    try:
        response = requests.get(url, headers={"User-Agent": USER_AGENT, "Accept": accept}, timeout=TIMEOUT, allow_redirects=True)
    except requests.RequestException:
        return None
    return response if response.ok else None


def _root(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, "", "", ""))


def _verify_feed(url: str) -> dict | None:
    response = _get(url, "application/rss+xml, application/atom+xml, application/xml, text/xml")
    if response is None:
        return None
    kind = (response.headers.get("Content-Type") or "").lower()
    if "html" in kind and b"<rss" not in response.content[:2000] and b"<feed" not in response.content[:2000]:
        return None
    parsed = feedparser.parse(response.content)
    entries = [e for e in parsed.entries if getattr(e, "title", "") and (getattr(e, "link", "") or getattr(e, "id", ""))]
    if not entries:
        return None
    # Full text or summaries? The difference between a complete article and a teaser.
    longest = max((len(re.sub(r"<[^>]+>", "", (e.get("content") or [{}])[0].get("value", "") or e.get("summary", ""))) for e in entries), default=0)
    return {"url": response.url, "entries": len(entries), "full_text": longest >= 1200}


def _verify_wp(root: str) -> tuple[str, int]:
    response = _get(root + WP_POSTS, "application/json")
    if response is None:
        return "", 0
    try:
        rows = response.json()
    except ValueError:
        return "", 0
    if isinstance(rows, list) and rows and all(isinstance(r, dict) and "title" in r and "link" in r for r in rows):
        return root + "/wp-json/wp/v2/posts", len(rows)
    return "", 0


def _verify_sitemap(url: str, rules: Rules, host: str) -> bool:
    response = _get(url, "application/xml, text/xml")
    if response is None or b"<" not in response.content[:200]:
        return False
    rows, children = sitemap_links(response.content, rules, host)
    return bool(rows or children)


def discover(url: str, *, render: bool = False) -> Finding:
    """Everything the site offers, verified, and the door to use.

    With `render`, pages are read through a headless browser, for sites that
    draw their news with JavaScript. A pages door found that way is stored
    with `render` set, so the poll reads it the same way.
    """
    global _RENDERER
    _RENDERER = Renderer() if render else None
    try:
        return _discover(url, render)
    finally:
        if _RENDERER is not None:
            _RENDERER.close()
        _RENDERER = None


def _discover(url: str, render: bool) -> Finding:
    finding = Finding(url=url)
    home = _get(url, "text/html,application/xhtml+xml")
    if home is None:
        finding.notes.append("The address did not answer.")
        return finding
    finding.reachable = True
    finding.final_url = home.url
    root = _root(home.url)
    hostname = urlsplit(root).netloc.lower().removeprefix("www.")

    host = Host.read(root)
    finding.robots_allows = None if host.closed else host.allows(home.url)
    finding.crawl_delay = host.delay if not host.closed else None
    if host.closed:
        finding.notes.append("robots.txt could not be read; pages are off the table until it can.")

    # 1. A public API. WordPress exposes one on every site unless it is switched off.
    finding.wp_api, finding.wp_posts_seen = _verify_wp(root)

    # 2. Feeds: announced on the home page, then the usual places.
    candidates: list[str] = []
    try:
        tree = lxml_html.fromstring(home.content)
        for link in tree.xpath('//link[@rel="alternate"]'):
            if "rss" in (link.get("type") or "").lower() or "atom" in (link.get("type") or "").lower():
                candidates.append(urljoin(home.url, link.get("href") or ""))
        for href in tree.xpath("//a/@href"):
            if re.search(r"/(feed|rss)/?$|\.(rss|xml)$|format=feed", href, re.IGNORECASE):
                candidates.append(urljoin(home.url, href))
    except (etree.ParserError, ValueError):
        pass
    candidates.extend(root + path for path in FEED_PATHS)
    seen: set[str] = set()
    for candidate in candidates:
        if candidate in seen or len(finding.feeds) >= 3:
            continue
        seen.add(candidate)
        verified = _verify_feed(candidate)
        if verified and verified["url"] not in {f["url"] for f in finding.feeds}:
            finding.feeds.append(verified)

    # 3. Pages: sitemaps and the listing page given, with one article read for real.
    rules = Rules.of(type("S", (), {"schema": {}, "address": home.url})())
    sitemap_candidates = [root + p for p in SITEMAP_PATHS]
    if host.robots is not None:
        sitemap_candidates = list(host.robots.site_maps() or []) + sitemap_candidates
    for candidate in dict.fromkeys(sitemap_candidates):
        if len(finding.sitemaps) >= 2:
            break
        if _verify_sitemap(candidate, rules, hostname):
            finding.sitemaps.append(candidate)
    if not host.closed and not finding.wp_api and not finding.feeds:
        finding.listing, finding.listing_links, finding.trial_article, section = _best_listing(home, root, host, rules)
        if section:
            finding.schema["include"] = [section]

    # The door, in Ma'at's order of preference.
    if finding.wp_api:
        finding.door = "api"
        finding.schema = {
            "items": "",
            "query": {"per_page": "20", "_fields": "id,date,link,title,excerpt,content"},
            "fields": {"title": "title.rendered", "body": ["content.rendered", "excerpt.rendered"], "date": "date", "link": "link"},
        }
    elif finding.feeds:
        finding.door = "feed"
        full = [f for f in finding.feeds if f["full_text"]] or finding.feeds
        finding.schema = {"feed": full[0]["url"]}
    elif finding.trial_article and finding.robots_allows:
        finding.door = "pages"
        finding.schema = {"listing": [finding.listing or home.url], "sitemaps": finding.sitemaps[:1], **finding.schema}
        if render:
            finding.schema["render"] = True
            finding.notes.append("Read through a browser: the site draws its pages with JavaScript.")
    elif finding.robots_allows is False:
        finding.notes.append("robots.txt does not allow reading this site's pages.")
    else:
        finding.notes.append("No API, no feed, and no page here read as a complete article.")
    return finding


def _trial(links: list[str], host: Host) -> dict | None:
    """The first of a few links that reads as a complete, dated article."""
    fallback = None
    for candidate in links[:4]:
        if not host.allows(candidate):
            continue
        page = _get(candidate, "text/html")
        if page is None:
            continue
        article = extract(page.content, page.url)
        if not (article and article.complete):
            continue
        found = {"url": page.url, "title": article.title, "chars": len(article.text), "date": str(article.published or "")}
        if article.published:
            return found
        fallback = fallback or found
    return fallback


def _best_listing(home, root: str, host: Host, rules: Rules) -> tuple[str, int, dict | None, str]:
    """(listing url, links on it, trial article, include pattern) for the page worth reading from.

    The home page is tried first, then the usual news paths. A listing wins on
    having a dated article behind it, then on how many article links it carries.
    The include pattern is the listing's own path when most of its articles
    live under it, which keeps the reader inside the news section.
    """
    best: tuple[int, str, int, dict | None, str] = (0, "", 0, None, "")
    seen: set[str] = set()
    for path in ("",) + NEWS_PATHS:
        url = home.url if path == "" else root + path
        page = home if path == "" else _get(url, "text/html,application/xhtml+xml")
        if page is None or page.url in seen or urlsplit(page.url).netloc != urlsplit(root).netloc:
            continue
        seen.add(page.url)
        links = article_links(page.content, page.url, rules)
        if not links:
            continue
        # Stories under the section's own path first, so the trial reads a
        # story rather than the first navigation link that looked like one.
        section_path = urlsplit(page.url).path.rstrip("/")
        if section_path:
            links.sort(key=lambda u: not urlsplit(u).path.startswith(section_path + "/"))
        trial = _trial(links, host)
        if trial is None:
            continue
        under = sum(1 for u in links if section_path and urlsplit(u).path.startswith(section_path + "/"))
        include = re.escape(section_path + "/") if section_path and under >= len(links) * 0.5 else ""
        # A news section beats the home page: it is the listing, not a brochure
        # that happens to link to a few stories.
        score = (2 if trial["date"] else 1) * 1000 + (500 if path else 0) + min(len(links), 200)
        if score > best[0]:
            best = (score, page.url, len(links), trial, include)
        if path and trial["date"] and len(links) >= 10:
            break
    return best[1], best[2], best[3], best[4]
