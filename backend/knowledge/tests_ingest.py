"""The upload door: parsing, versioning, and what happens when either fails."""

from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from ai.embeddings import EmbeddingUnavailable
from knowledge.models import Chunk, Document, Source
from knowledge.parsing import DocumentUnreadable, build_chunks
from knowledge.services import ingest_document

NOTICE = (
    "COMMENCEMENT NOTICE\n\n"
    "The levy takes effect on 1 October 2026. " + ("Details follow in the schedule. " * 30) + "\n\n"
    "PART III RATES AND EXEMPTIONS\n\n"
    "The standard rate is seven and a half per cent. " + ("Exemptions are listed below. " * 30)
).encode()


class ParsingTests(TestCase):
    def test_passages_carry_their_heading(self):
        passages = build_chunks("notice.txt", NOTICE)
        self.assertGreaterEqual(len(passages), 2)
        self.assertEqual(passages[0]["heading_path"], "COMMENCEMENT NOTICE")
        self.assertEqual(passages[-1]["heading_path"], "PART III RATES AND EXEMPTIONS")

    def test_an_unreadable_file_says_why(self):
        with self.assertRaises(DocumentUnreadable) as caught:
            build_chunks("scan.pdf", b"%PDF-1.4 truncated")
        self.assertIn("PDF", str(caught.exception))

    def test_an_empty_file_is_refused(self):
        with self.assertRaises(DocumentUnreadable):
            build_chunks("empty.txt", b"   ")

    def test_an_unsupported_format_names_what_is_accepted(self):
        with self.assertRaises(DocumentUnreadable) as caught:
            build_chunks("data.json", b"{}")
        self.assertIn("PDF", str(caught.exception))


class IngestTests(TestCase):
    def setUp(self):
        self.source = Source.objects.create(name="Federal Ministry of Finance", slug="fmf")

    def test_an_upload_becomes_a_document_with_passages(self):
        document = ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
        self.assertTrue(document.is_current)
        self.assertEqual(document.version, 1)
        self.assertGreaterEqual(document.chunks.count(), 2)
        self.assertTrue(all(c.embedding is not None for c in document.chunks.all()))
        self.assertEqual(document.title, "COMMENCEMENT NOTICE")

    def test_re_uploading_versions_and_retires_the_old_one(self):
        first = ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
        second = ingest_document(source=self.source, filename="notice.txt", data=NOTICE + b"\n\nAMENDED.")
        first.refresh_from_db()
        self.assertFalse(first.is_current)
        self.assertTrue(second.is_current)
        self.assertEqual(second.version, 2)
        # The old version survives, and so do its passages, marked not current.
        self.assertEqual(Document.objects.filter(identifier="notice.txt").count(), 2)
        self.assertFalse(Chunk.objects.filter(document=first, is_current=True).exists())

    def test_identical_bytes_cost_no_embeddings(self):
        ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
        with patch("knowledge.services.embed_documents") as embed:
            ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
            embed.assert_not_called()

    def test_a_failed_embedding_leaves_the_working_version_alone(self):
        good = ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
        with patch("knowledge.services.embed_documents", side_effect=EmbeddingUnavailable("provider down")):
            with self.assertRaises(EmbeddingUnavailable):
                ingest_document(source=self.source, filename="notice.txt", data=NOTICE + b"\n\nAMENDED.")
        good.refresh_from_db()
        self.assertTrue(good.is_current)
        self.assertEqual(Document.objects.filter(identifier="notice.txt").count(), 1)

    def test_an_unreadable_upload_leaves_the_working_version_alone(self):
        good = ingest_document(source=self.source, filename="notice.txt", data=NOTICE)
        with self.assertRaises(DocumentUnreadable):
            ingest_document(source=self.source, filename="notice.txt", data=b"   ")
        good.refresh_from_db()
        self.assertTrue(good.is_current)


class UploadEndpointTests(TestCase):
    def setUp(self):
        self.source = Source.objects.create(name="Ministry", slug="ministry")
        self.user = get_user_model().objects.create_user(username="staff", password="x" * 12)

    def _post(self, name=b"notice.txt", data=NOTICE, **extra):
        payload = {"file": SimpleUploadedFile(name.decode() if isinstance(name, bytes) else name, data), "source": str(self.source.id)}
        payload.update(extra)
        return self.client.post("/api/documents/", payload)

    def test_signing_in_is_required(self):
        self.assertIn(self._post().status_code, (401, 403))

    def test_a_staff_upload_is_read_and_stored(self):
        self.client.force_login(self.user)
        response = self._post(isPublic="true")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertGreaterEqual(response.data["chunks"], 2)
        self.assertTrue(response.data["isPublic"])

    def test_an_unsupported_format_is_refused_before_anything_is_read(self):
        self.client.force_login(self.user)
        response = self._post(name="rows.csv", data=b"a,b\n1,2\n")
        self.assertEqual(response.status_code, 415)
        self.assertEqual(Document.objects.count(), 0)

    def test_an_upload_without_a_source_is_refused(self):
        self.client.force_login(self.user)
        response = self.client.post("/api/documents/", {"file": SimpleUploadedFile("notice.txt", NOTICE)})
        self.assertEqual(response.status_code, 400)


class ConcurrentWriterTests(TestCase):
    def test_a_version_taken_by_another_writer_is_retried(self):
        from unittest.mock import patch

        from django.db import IntegrityError

        from knowledge import services
        from knowledge.models import Source
        from knowledge.services import ingest_document

        source = Source.objects.create(name="Body", slug="body")
        real = services._store_once
        calls = {"n": 0}

        def flaky(**kwargs):
            calls["n"] += 1
            if calls["n"] == 1:
                raise IntegrityError("duplicate key value violates unique constraint")
            return real(**kwargs)

        with patch.object(services, "_store_once", side_effect=flaky):
            document = ingest_document(
                source=source, filename="notice.txt", content_type="text/plain",
                data=b"The agency confirmed that relief materials were dispatched to the affected communities.",
            )
        self.assertEqual(calls["n"], 2)
        self.assertEqual(document.version, 1)


class CleanTextTests(TestCase):
    def test_invisible_characters_are_stripped_before_chunking(self):
        text = "Some vulnerable fami\u200blies in Lugbe\u00a0hived signs of relief as the foundation paid tui\u200dtion fees for 10 wards.\u2060 " * 3
        chunks = build_chunks("nan.txt", text.encode("utf-8"))
        joined = " ".join(c["text"] for c in chunks)
        self.assertIn("families", joined)
        self.assertIn("tuition fees", joined)
        self.assertNotIn("\u200b", joined)
        self.assertNotIn("\u00a0", joined)

    def test_double_encoded_text_is_put_back(self):
        from knowledge.parsing import clean_text

        self.assertEqual(clean_text("â€¢ Point of entry surveillance using the passengerâ€™s form"), "• Point of entry surveillance using the passenger’s form")
        self.assertEqual(clean_text("Plain text stays plain"), "Plain text stays plain")
        self.assertEqual(clean_text("Café â€¢ open â€” now"), "Café • open — now")
