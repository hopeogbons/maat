"""Polling: what it ingests, what it skips, and how it fails."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from knowledge.feeds import FAILURE_LIMIT, is_due, poll, read_entries
from knowledge.models import Document, IngestionRun, Source

FEED = b"""<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Ministry updates</title>
  <item>
    <title>Levy commencement confirmed</title>
    <link>https://example.org/news/levy-commencement</link>
    <pubDate>Mon, 14 Sep 2026 09:00:00 +0000</pubDate>
    <description>&lt;p&gt;The Ministry confirms the levy takes effect on 1 October 2026.&lt;/p&gt;</description>
  </item>
  <item>
    <title>School calendar published</title>
    <link>https://example.org/news/school-calendar</link>
    <pubDate>Sat, 12 Sep 2026 09:00:00 +0000</pubDate>
    <description>The 2026/2027 session begins on 15 September.</description>
  </item>
</channel></rss>"""


class ReadingTests(TestCase):
    def test_entries_carry_title_prose_and_date(self):
        entries = read_entries(FEED)
        self.assertEqual(len(entries), 2)
        first = entries[0]
        self.assertEqual(first.title, "Levy commencement confirmed")
        self.assertEqual(first.identifier, "https://example.org/news/levy-commencement")
        self.assertIn("1 October 2026", first.body)
        # The markup the feed escaped must not reach the corpus.
        self.assertNotIn("<p>", first.body)
        self.assertEqual(first.published.date().isoformat(), "2026-09-14")

    def test_an_entry_without_an_identifier_is_dropped(self):
        # Given one, it would look new on every poll and duplicate forever.
        entries = read_entries(b"<rss><channel><item><title>No link</title></item></channel></rss>")
        self.assertEqual(entries, [])


class PollingTests(TestCase):
    def setUp(self):
        self.source = Source.objects.create(
            name="Ministry of Health",
            slug="moh",
            door=Source.Door.FEED,
            address="https://example.org/rss.xml",
            cadence_minutes=180,
        )

    def test_a_poll_ingests_every_entry_once(self):
        with patch("knowledge.feeds.fetch", return_value=(200, FEED)), patch("knowledge.feeds._remember_validators"):
            run = poll(self.source)
        self.assertEqual(run.status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual(run.documents_seen, 2)
        self.assertEqual(run.documents_added, 2)
        self.assertGreater(run.chunks_written, 0)
        self.assertEqual(Document.active.count(), 2)
        # The citation names the entry, and links where the body published it.
        doc = Document.active.get(url="https://example.org/news/levy-commencement")
        self.assertEqual(doc.title, "Levy commencement confirmed")

    def test_polling_again_adds_nothing(self):
        with patch("knowledge.feeds.fetch", return_value=(200, FEED)), patch("knowledge.feeds._remember_validators"):
            poll(self.source)
            run = poll(self.source)
        self.assertEqual(run.documents_added, 0)
        self.assertEqual(Document.objects.count(), 2)

    def test_a_corrected_entry_becomes_a_new_version(self):
        with patch("knowledge.feeds.fetch", return_value=(200, FEED)), patch("knowledge.feeds._remember_validators"):
            poll(self.source)
            amended = FEED.replace(b"1 October 2026", b"1 November 2026")
        with patch("knowledge.feeds.fetch", return_value=(200, amended)), patch(
            "knowledge.feeds._remember_validators"
        ):
            run = poll(self.source)
        self.assertEqual(run.documents_added, 1)
        versions = Document.objects.filter(url="https://example.org/news/levy-commencement")
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions.filter(is_current=True).count(), 1)

    def test_not_modified_costs_nothing(self):
        with patch("knowledge.feeds.fetch", return_value=(304, b"")):
            run = poll(self.source)
        self.assertEqual(run.status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual(run.documents_seen, 0)
        self.assertEqual(Document.objects.count(), 0)

    def test_a_failure_is_recorded_and_counted(self):
        with patch("knowledge.feeds.fetch", side_effect=OSError("connection refused")):
            run = poll(self.source)
        self.source.refresh_from_db()
        self.assertEqual(run.status, IngestionRun.Status.FAILED)
        self.assertIn("connection refused", run.error)
        self.assertEqual(self.source.failure_count, 1)
        self.assertIsNotNone(self.source.last_polled_at)

    def test_a_success_clears_the_failures(self):
        self.source.failure_count = 3
        self.source.save(update_fields=["failure_count"])
        with patch("knowledge.feeds.fetch", return_value=(200, FEED)), patch("knowledge.feeds._remember_validators"):
            poll(self.source)
        self.source.refresh_from_db()
        self.assertEqual(self.source.failure_count, 0)

    def test_cadence_decides_what_is_due(self):
        self.assertTrue(is_due(self.source))  # never polled
        self.source.last_polled_at = timezone.now()
        self.assertFalse(is_due(self.source))
        self.source.last_polled_at = timezone.now() - timedelta(minutes=181)
        self.assertTrue(is_due(self.source))

    def test_a_source_failing_repeatedly_stops_being_polled(self):
        self.source.failure_count = FAILURE_LIMIT
        self.assertFalse(is_due(self.source))

    def test_an_inactive_or_non_feed_source_is_never_due(self):
        self.source.is_active = False
        self.assertFalse(is_due(self.source))
        self.source.is_active = True
        self.source.door = Source.Door.UPLOAD
        self.assertFalse(is_due(self.source))


class CountryFilingTests(TestCase):
    """A global feed's stories are filed under the covered country they name."""

    def setUp(self):
        from appsettings.models import CountryCoverage
        from core.models import Country

        self.ng = Country.objects.create(name="Nigeria", iso2="NG", iso3="NGA", numeric_code="566")
        self.ke = Country.objects.create(name="Kenya", iso2="KE", iso3="KEN", numeric_code="404")
        CountryCoverage.objects.create(country=self.ng, is_active=True)
        CountryCoverage.objects.create(country=self.ke, is_active=False)
        self.feed = Source.objects.create(name="UN News", slug="un", door=Source.Door.FEED, address="https://example.org/rss")

    def _poll(self, items: str):
        body = f"<rss version='2.0'><channel><title>t</title>{items}</channel></rss>".encode()
        with patch("knowledge.feeds.fetch", return_value=(200, body)), patch("knowledge.feeds._remember_validators"):
            poll(self.feed)

    @staticmethod
    def _item(link, title, text):
        return f"<item><title>{title}</title><link>{link}</link><description>{text}</description></item>"

    def test_a_story_naming_one_covered_country_is_filed_under_it(self):
        self._poll(self._item("https://x/1", "Flooding in Lagos displaces thousands", "Rescue efforts continue in Lagos state."))
        self.assertEqual(Document.active.get().country, self.ng)

    def test_a_country_switched_off_still_receives_its_stories(self):
        self._poll(self._item("https://x/2", "Nairobi hospital reopens", "The Kenyan ministry confirmed the reopening."))
        self.assertEqual(Document.active.get().country, self.ke)

    def test_a_story_naming_no_covered_country_stays_global(self):
        self._poll(self._item("https://x/3", "Gaza ceasefire talks resume", "Negotiators met in Cairo."))
        self.assertIsNone(Document.active.get().country)

    def test_a_story_about_two_countries_stays_global(self):
        self._poll(self._item("https://x/4", "Nigeria and Kenya sign trade pact", "Abuja and Nairobi agree terms."))
        self.assertIsNone(Document.active.get().country)

    def test_a_source_of_a_country_switched_off_is_not_polled(self):
        from knowledge.feeds import poll_due

        Source.objects.create(name="NCDC", slug="ncdc", door=Source.Door.FEED, address="https://ng.example/rss", country=self.ng)
        Source.objects.create(name="Kenya MoH", slug="ke-moh", door=Source.Door.FEED, address="https://ke.example/rss", country=self.ke)
        with patch("knowledge.feeds.fetch", return_value=(304, b"")) as fetch:
            polled = {run.source.slug for run in poll_due(force=True)}
        self.assertEqual(polled, {"un", "ncdc"})
        self.assertNotIn("https://ke.example/rss", {call.args[0].address for call in fetch.call_args_list})

    def test_niger_is_not_nigeria(self):
        self._poll(self._item("https://x/5", "Coup attempt reported in Niger", "Niamey was calm by evening."))
        self.assertIsNone(Document.active.get().country)
