"""The pages door: manners, finding articles, reading them once, batch by batch."""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from unittest.mock import patch
from urllib.robotparser import RobotFileParser

from django.test import TestCase

from knowledge.models import Document, IngestionRun, Source
from knowledge.pages import Host, Rules, article_links, extract, poll_pages, sitemap_links

LISTING = b"""
<html><body>
<nav><a href="/">Home</a> <a href="/about/">About</a> <a href="/category/news/">News</a> <a href="/tag/flood/">flood</a></nav>
<main>
 <a href="/news/flooding-in-kano-displaces-thousands/">Flooding in Kano displaces thousands</a>
 <a href="https://www.example.gov.ng/news/cholera-alert-issued-for-bauchi/?utm_source=x#top">Cholera alert</a>
 <a href="/news/flooding-in-kano-displaces-thousands/">(again)</a>
 <a href="https://elsewhere.org/news/some-story-here/">Elsewhere</a>
 <a href="/page/2/">Older</a>
 <a href="/news/?page=2">Older still</a>
 <a href="/documents/situation-report-12.pdf">Sitrep 12</a>
</main></body></html>
"""


def _article(title: str, when: str, paragraphs: int = 4) -> bytes:
    body = "".join(
        f"<p>Paragraph {i}. The agency confirmed that relief materials were dispatched to the affected "
        f"communities and that assessment teams remain on the ground to record the damage in detail.</p>"
        for i in range(paragraphs)
    )
    return f"""<html><head><title>{title}</title>
<meta property="article:published_time" content="{when}T09:00:00+00:00">
<meta property="og:title" content="{title}"></head>
<body><header><nav><a href="/">Home</a><a href="/news/">News</a></nav></header>
<main><article><h1>{title}</h1><time datetime="{when}">{when}</time>{body}</article></main>
<footer><p>© Agency. All rights reserved. Privacy. Terms.</p></footer></body></html>""".encode()


def _open_host(root="https://www.example.gov.ng", disallow: str = "") -> Host:
    parser = RobotFileParser()
    parser.parse(["User-agent: *", f"Disallow: {disallow}"] if disallow else ["User-agent: *", "Allow: /"])
    return Host(root=root, robots=parser, delay=0)


def _response(url: str, content: bytes, kind: str = "text/html; charset=utf-8"):
    return SimpleNamespace(url=url, content=content, headers={"Content-Type": kind})


class LinkTests(TestCase):
    def setUp(self):
        self.rules = Rules(listing=["https://www.example.gov.ng/news/"], sitemaps=[], include=[], exclude=[])
        self.rules = Rules.of(Source(address="https://www.example.gov.ng/news/", schema={}))

    def test_article_links_are_the_stories_not_the_furniture(self):
        links = article_links(LISTING, "https://www.example.gov.ng/news/", self.rules)
        self.assertEqual(
            links,
            [
                "https://www.example.gov.ng/news/flooding-in-kano-displaces-thousands/",
                "https://www.example.gov.ng/news/cholera-alert-issued-for-bauchi/",
                "https://www.example.gov.ng/documents/situation-report-12.pdf",
            ],
        )

    def test_an_include_rule_narrows_to_the_section_named(self):
        rules = Rules.of(Source(address="https://www.example.gov.ng/", schema={"include": [r"/news/"]}))
        links = article_links(LISTING, "https://www.example.gov.ng/", rules)
        self.assertTrue(all("/news/" in u for u in links))
        self.assertEqual(len(links), 2)

    def test_sitemaps_give_articles_newest_first_and_their_children(self):
        xml = b"""<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://www.example.gov.ng/news/older-story-about-roads/</loc><lastmod>2026-09-01</lastmod></url>
        <url><loc>https://www.example.gov.ng/news/newer-story-about-floods/</loc><lastmod>2026-09-14</lastmod></url>
        <url><loc>https://www.example.gov.ng/tag/floods/</loc><lastmod>2026-09-14</lastmod></url></urlset>"""
        rows, children = sitemap_links(xml, self.rules, "example.gov.ng")
        self.assertEqual([u for u, _ in rows], ["https://www.example.gov.ng/news/newer-story-about-floods/", "https://www.example.gov.ng/news/older-story-about-roads/"])
        self.assertEqual(children, [])
        index = b"""<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://www.example.gov.ng/post-sitemap1.xml</loc></sitemap></sitemapindex>"""
        rows, children = sitemap_links(index, self.rules, "example.gov.ng")
        self.assertEqual((rows, children), ([], ["https://www.example.gov.ng/post-sitemap1.xml"]))


class ExtractTests(TestCase):
    def test_the_article_comes_out_without_the_furniture(self):
        article = extract(_article("Flooding in Kano displaces thousands", "2026-09-12"), "https://www.example.gov.ng/news/flooding/")
        self.assertIsNotNone(article)
        self.assertEqual(article.title, "Flooding in Kano displaces thousands")
        self.assertEqual(article.published, date(2026, 9, 12))
        self.assertIn("relief materials", article.text)
        self.assertNotIn("All rights reserved", article.text)
        self.assertTrue(article.complete)

    def test_a_stub_is_not_an_article(self):
        article = extract(_article("Gallery", "2026-09-12", paragraphs=0), "https://www.example.gov.ng/gallery/")
        self.assertFalse(article is not None and article.complete)


class ManagerTests(TestCase):
    def test_robots_rules_and_delay_are_read(self):
        text = "User-agent: *\nDisallow: /private/\nCrawl-delay: 5\n"
        with patch("knowledge.pages.requests.get", return_value=SimpleNamespace(status_code=200, text=text)):
            host = Host.read("https://www.example.gov.ng/news/")
        self.assertFalse(host.closed)
        self.assertEqual(host.delay, 5.0)
        self.assertTrue(host.allows("https://www.example.gov.ng/news/x/"))
        self.assertFalse(host.allows("https://www.example.gov.ng/private/x/"))

    def test_no_robots_file_means_public_pages_are_fine(self):
        with patch("knowledge.pages.requests.get", return_value=SimpleNamespace(status_code=404, text="")):
            host = Host.read("https://www.example.gov.ng/")
        self.assertTrue(host.allows("https://www.example.gov.ng/news/x/"))

    def test_a_server_error_on_robots_closes_the_door(self):
        with patch("knowledge.pages.requests.get", return_value=SimpleNamespace(status_code=503, text="")):
            host = Host.read("https://www.example.gov.ng/")
        self.assertTrue(host.closed)
        self.assertFalse(host.allows("https://www.example.gov.ng/news/x/"))


class PollTests(TestCase):
    def setUp(self):
        self.source = Source.objects.create(
            name="National Emergency Management Agency", slug="nema", door=Source.Door.PAGES,
            address="https://www.example.gov.ng/news/", schema={"include": [r"/news/"]},
        )
        self.pages = {
            "https://www.example.gov.ng/news/": _response("https://www.example.gov.ng/news/", LISTING),
            "https://www.example.gov.ng/news/flooding-in-kano-displaces-thousands/": _response(
                "https://www.example.gov.ng/news/flooding-in-kano-displaces-thousands/", _article("Flooding in Kano displaces thousands", "2026-09-12")
            ),
            "https://www.example.gov.ng/news/cholera-alert-issued-for-bauchi/": _response(
                "https://www.example.gov.ng/news/cholera-alert-issued-for-bauchi/", _article("Cholera alert issued for Bauchi", "2026-09-10")
            ),
        }
        self.fetched: list[str] = []

    def _get(self, host, url):
        self.fetched.append(url)
        return self.pages[url]

    def _poll(self, host=None):
        with patch("knowledge.pages.Host.read", return_value=host or _open_host()), patch("knowledge.pages._get", self._get):
            return poll_pages(self.source)

    def test_a_poll_reads_the_listing_then_each_new_article_once(self):
        run = self._poll()
        self.assertEqual(run.status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual((run.documents_seen, run.documents_added), (2, 2))
        flood = Document.active.get(url="https://www.example.gov.ng/news/flooding-in-kano-displaces-thousands/")
        self.assertEqual(flood.title, "Flooding in Kano displaces thousands")
        self.assertEqual(flood.published_at, date(2026, 9, 12))
        self.assertGreater(flood.chunks.count(), 0)

        # Polling again fetches the listing only. Nothing already held is asked for.
        self.fetched.clear()
        run = self._poll()
        self.assertEqual(run.documents_added, 0)
        self.assertEqual(self.fetched, ["https://www.example.gov.ng/news/"])

    def test_the_batch_is_capped(self):
        self.source.schema = {"include": [r"/news/"], "max_new": 1}
        self.source.save()
        run = self._poll()
        self.assertEqual(run.documents_added, 1)

    def test_robots_disallowing_the_section_means_nothing_is_fetched(self):
        run = self._poll(_open_host(disallow="/news/"))
        self.assertEqual(run.status, IngestionRun.Status.FAILED)
        self.assertIn("robots.txt disallows", run.error)
        self.assertEqual(self.fetched, [])

    def test_an_unreadable_robots_file_means_nothing_is_fetched(self):
        run = self._poll(Host(root="https://www.example.gov.ng", robots=None, closed=True))
        self.assertEqual(run.status, IngestionRun.Status.FAILED)
        self.assertIn("robots.txt", run.error)
        self.assertEqual(self.fetched, [])
        self.source.refresh_from_db()
        self.assertEqual(self.source.failure_count, 1)

    def test_the_scheduler_knocks_on_this_door_and_skips_lookup_only_apis(self):
        from knowledge.feeds import is_due, poll_due

        lookup_only = Source.objects.create(
            name="World Bank", slug="wb", door=Source.Door.API, address="https://api.worldbank.org/v2/", schema={"lookup": True}
        )
        self.assertFalse(is_due(lookup_only))
        with patch("knowledge.pages.Host.read", return_value=_open_host()), patch("knowledge.pages._get", self._get), patch(
            "knowledge.connectors.fetch"
        ) as api_fetch:
            runs = poll_due(force=True)
        self.assertEqual([r.source.slug for r in runs], ["nema"])
        api_fetch.assert_not_called()
