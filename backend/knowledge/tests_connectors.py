"""The schema-driven connector: auth, paths, dates, samples, failures."""

from __future__ import annotations

from datetime import date
from unittest.mock import patch

from django.test import TestCase

from knowledge.connectors import build_request, normalise_date, poll_api, read_items, resolve
from knowledge.models import Document, IngestionRun, Source

RELIEFWEB_SHAPED = {
    "data": [
        {
            "id": "1",
            "fields": {
                "title": "Floods displace thousands in Kano",
                "body": "<p>Heavy rain since Tuesday has flooded three districts.</p>",
                "date": {"created": "2026-09-12T08:15:00+00:00"},
                "url": "https://example.org/report/1",
            },
        },
        {
            "id": "2",
            "fields": {"title": "Cholera update", "date": {"created": "2026-09-10"}},
            "url": "https://example.org/report/2",
        },
    ]
}

SCHEMA = {
    "items": "data",
    "fields": {
        "title": "fields.title",
        "body": ["fields.body", "fields.summary"],
        "date": "fields.date.created",
        "link": ["fields.url", "url"],
    },
}


class PathTests(TestCase):
    def test_dotted_paths_walk_dicts_and_index_lists(self):
        data = {"a": {"b": [{"c": "deep"}]}}
        self.assertEqual(resolve(data, "a.b.0.c"), "deep")

    def test_fallbacks_are_tried_in_order(self):
        self.assertEqual(resolve({"y": 2}, ["x", "y"]), 2)

    def test_a_missing_path_is_null_not_an_error(self):
        self.assertIsNone(resolve({"a": 1}, "a.b.c"))
        self.assertIsNone(resolve({"a": 1}, ["nope", "also.nope"]))
        self.assertIsNone(resolve([1, 2], "5"))

    def test_the_empty_path_is_the_value_itself(self):
        self.assertEqual(resolve([1, 2, 3], ""), [1, 2, 3])


class ItemTests(TestCase):
    def test_items_are_read_by_the_schema_with_fallbacks_and_nulls(self):
        items = read_items(RELIEFWEB_SHAPED, SCHEMA)
        self.assertEqual(len(items), 2)
        first, second = items
        self.assertEqual(first.title, "Floods displace thousands in Kano")
        self.assertEqual(first.body, "Heavy rain since Tuesday has flooded three districts.")  # tags stripped
        self.assertEqual(first.date, date(2026, 9, 12))
        self.assertEqual(first.link, "https://example.org/report/1")
        # Second item: no body anywhere, link found on the fallback path.
        self.assertIsNone(second.body)
        self.assertEqual(second.link, "https://example.org/report/2")
        self.assertEqual(second.date, date(2026, 9, 10))

    def test_a_root_level_array_and_a_single_object_both_read(self):
        self.assertEqual(len(read_items([{"t": "a"}, {"t": "b"}], {"items": "", "fields": {"title": "t"}})), 2)
        self.assertEqual(len(read_items({"t": "only"}, {"items": "", "fields": {"title": "t"}})), 1)

    def test_no_schema_means_no_items(self):
        self.assertEqual(read_items(RELIEFWEB_SHAPED, {}), [])


class DateTests(TestCase):
    def test_the_shapes_apis_actually_use(self):
        cases = {
            "2026-09-12": date(2026, 9, 12),
            "2026-09-12T08:15:00+00:00": date(2026, 9, 12),
            "2026-09-12T08:15:00Z": date(2026, 9, 12),
            "Mon, 14 Sep 2026 09:00:00 +0000": date(2026, 9, 14),
            "12/09/2026": date(2026, 9, 12),
            "12 September 2026": date(2026, 9, 12),
            "September 12, 2026": date(2026, 9, 12),
            "2026-09": date(2026, 9, 1),
            "2025": date(2025, 1, 1),
            1757664900: date(2025, 9, 12),
            1757664900000: date(2025, 9, 12),
        }
        for raw, expected in cases.items():
            self.assertEqual(normalise_date(raw), expected, raw)

    def test_not_a_date_is_none_not_a_guess(self):
        for raw in ("", None, "soon", "Q3", "n/a", "12345678901234567890"):
            self.assertIsNone(normalise_date(raw), raw)


class AuthTests(TestCase):
    def _source(self, auth, schema=None):
        return Source(name="x", slug="x", door=Source.Door.API, address="https://api.example.org/v1", auth=auth, schema=schema or {})

    def test_an_empty_block_sends_a_plain_request(self):
        headers, params, basic = build_request(self._source({}))
        self.assertNotIn("Authorization", headers)
        self.assertEqual(params, {})
        self.assertIsNone(basic)

    def test_api_key_goes_where_the_block_says(self):
        headers, params, _ = build_request(self._source({"type": "api_key", "key": "k1", "name": "X-Api-Key"}))
        self.assertEqual(headers["X-Api-Key"], "k1")
        headers, params, _ = build_request(self._source({"type": "api_key", "key": "k1", "name": "apikey", "in": "query"}))
        self.assertEqual(params["apikey"], "k1")
        self.assertNotIn("apikey", headers)

    def test_bearer_and_basic(self):
        headers, _, _ = build_request(self._source({"type": "bearer", "token": "t0k"}))
        self.assertEqual(headers["Authorization"], "Bearer t0k")
        _, _, basic = build_request(self._source({"type": "basic", "username": "u", "password": "p"}))
        self.assertEqual(basic, ("u", "p"))

    def test_a_type_with_no_credential_degrades_to_plain(self):
        headers, params, basic = build_request(self._source({"type": "bearer"}))
        self.assertNotIn("Authorization", headers)
        self.assertIsNone(basic)

    def test_schema_query_parameters_ride_along(self):
        _, params, _ = build_request(self._source({}, {"query": {"appname": "maat", "limit": "20"}}))
        self.assertEqual(params, {"appname": "maat", "limit": "20"})


class PollTests(TestCase):
    def setUp(self):
        self.source = Source.objects.create(
            name="ReliefWeb", slug="rw", door=Source.Door.API, address="https://api.example.org/v2/reports", schema=SCHEMA
        )

    def test_items_are_ingested_and_the_response_is_sampled_once(self):
        with patch("knowledge.connectors.fetch", return_value=RELIEFWEB_SHAPED):
            run = poll_api(self.source)
        self.source.refresh_from_db()
        self.assertEqual(run.status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual(run.documents_seen, 2)
        self.assertEqual(run.documents_added, 2)
        self.assertIsNotNone(self.source.response_sample)
        self.assertIsNotNone(self.source.response_sample_at)
        doc = Document.active.get(url="https://example.org/report/1")
        self.assertEqual(doc.title, "Floods displace thousands in Kano")
        self.assertEqual(doc.published_at, date(2026, 9, 12))

        # A second fetch neither re-ingests nor overwrites the first sample.
        stamp = self.source.response_sample_at
        with patch("knowledge.connectors.fetch", return_value=RELIEFWEB_SHAPED):
            run = poll_api(self.source)
        self.source.refresh_from_db()
        self.assertEqual(run.documents_added, 0)
        self.assertEqual(self.source.response_sample_at, stamp)

    def test_a_source_without_a_schema_is_sampled_and_nothing_else(self):
        self.source.schema = {}
        self.source.save()
        with patch("knowledge.connectors.fetch", return_value=RELIEFWEB_SHAPED):
            run = poll_api(self.source)
        self.source.refresh_from_db()
        self.assertEqual(run.status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual(run.documents_added, 0)
        self.assertIsNotNone(self.source.response_sample)

    def test_the_sample_keeps_the_shape_and_drops_the_bulk(self):
        big = {
            "result": {
                "count": 4000,
                "results": [
                    {
                        "title": f"dataset {i}",
                        "notes": "x" * 5000,
                        "resources": [{"url": f"https://x/{i}/{j}", "format": "CSV"} for j in range(40)],
                        "tags": [{"name": f"tag{j}"} for j in range(30)],
                    }
                    for i in range(50)
                ],
            }
        }
        with patch("knowledge.connectors.fetch", return_value=big):
            poll_api(self.source)
        self.source.refresh_from_db()
        sample = self.source.response_sample
        # Real JSON, not a preview string.
        self.assertNotIn("_truncated", sample)
        self.assertEqual(sample["result"]["count"], 4000)
        # The items list keeps a few; the lists inside an item keep one each.
        self.assertEqual(len(sample["result"]["results"]), 3)
        self.assertEqual(len(sample["result"]["results"][0]["resources"]), 1)
        self.assertEqual(len(sample["result"]["results"][0]["tags"]), 1)
        # Long prose is cut to a preview, the shape of the field intact.
        self.assertTrue(sample["result"]["results"][0]["notes"].endswith("…"))
        self.assertLess(len(sample["result"]["results"][0]["notes"]), 250)

    def test_a_failure_is_recorded_on_the_source_and_does_not_raise(self):
        with patch("knowledge.connectors.fetch", side_effect=OSError("timed out")):
            run = poll_api(self.source)
        self.source.refresh_from_db()
        self.assertEqual(run.status, IngestionRun.Status.FAILED)
        self.assertIn("timed out", run.error)
        self.assertEqual(self.source.failure_count, 1)
        self.assertIsNone(self.source.response_sample)

    def test_one_failing_source_does_not_stop_the_others(self):
        from knowledge.feeds import poll_due

        healthy = Source.objects.create(
            name="Other", slug="other", door=Source.Door.API, address="https://api.example.org/other", schema=SCHEMA
        )

        def fetch(source):
            if source.slug == "rw":
                raise OSError("down")
            return RELIEFWEB_SHAPED

        with patch("knowledge.connectors.fetch", side_effect=fetch):
            runs = poll_due(force=True)
        by = {r.source.slug: r for r in runs}
        self.assertEqual(by["rw"].status, IngestionRun.Status.FAILED)
        self.assertEqual(by["other"].status, IngestionRun.Status.SUCCEEDED)
        self.assertEqual(by["other"].documents_added, 2)
        del healthy
