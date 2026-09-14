from django.core.management import call_command
from django.db import IntegrityError
from django.test import TestCase

from core.models import Country
from knowledge.models import Chunk, Document, IngestionRun, Source


class SourceTests(TestCase):
    def test_a_source_with_no_country_speaks_for_everywhere(self):
        source = Source.objects.create(name="World Health Organization", slug="who")
        self.assertIsNone(source.country)
        self.assertEqual(source.where, "Global")

    def test_a_country_limited_source_names_its_country(self):
        call_command("seed_currencies_and_timezones", verbosity=0)
        call_command("sync_countries_and_states", verbosity=0, skip_states=True)
        source = Source.objects.create(
            name="Nigeria Centre for Disease Control",
            slug="ncdc",
            country=Country.objects.get(iso2="NG"),
        )
        self.assertEqual(source.where, "Nigeria")


class DocumentTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.source = Source.objects.create(name="World Health Organization", slug="who")

    def test_the_citation_is_the_publishing_body(self):
        document = Document.objects.create(
            source=self.source, title="Malaria guidance", identifier="malaria.pdf", fingerprint="a"
        )
        self.assertEqual(document.citation, "World Health Organization")

    def test_the_same_document_can_be_stored_at_several_versions(self):
        for version in (1, 2, 3):
            Document.objects.create(
                source=self.source,
                title="Malaria guidance",
                identifier="malaria.pdf",
                fingerprint=f"v{version}",
                version=version,
                is_current=version == 3,
            )
        self.assertEqual(Document.objects.count(), 3)
        self.assertEqual(Document.objects.filter(is_current=True).count(), 1)

    def test_the_same_version_cannot_be_stored_twice(self):
        Document.objects.create(
            source=self.source, title="Guidance", identifier="g.pdf", fingerprint="a"
        )
        with self.assertRaises(IntegrityError):
            Document.objects.create(
                source=self.source, title="Guidance", identifier="g.pdf", fingerprint="b"
            )


class ChunkTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.source = Source.objects.create(name="World Health Organization", slug="who")
        cls.document = Document.objects.create(
            source=cls.source, title="Malaria guidance", identifier="malaria.pdf", fingerprint="a"
        )

    def test_a_chunk_carries_its_source_as_the_citation(self):
        chunk = Chunk.objects.create(document=self.document, text="Bed nets are distributed free.")
        self.assertEqual(chunk.citation, "World Health Organization")

    def test_an_embedding_is_stored_and_read_back(self):
        chunk = Chunk.objects.create(
            document=self.document, text="Bed nets.", embedding=[0.1] * 1536
        )
        self.assertEqual(len(Chunk.objects.get(pk=chunk.pk).embedding), 1536)

    def test_a_document_holds_fragments_and_one_card(self):
        Chunk.objects.create(document=self.document, kind=Chunk.Kind.CARD, text="About malaria.")
        for i in range(3):
            Chunk.objects.create(document=self.document, chunk_index=i, text=f"part {i}")
        self.assertEqual(self.document.chunks.filter(kind=Chunk.Kind.CARD).count(), 1)
        self.assertEqual(self.document.chunks.filter(kind=Chunk.Kind.FRAGMENT).count(), 3)

    def test_two_chunks_cannot_claim_the_same_position(self):
        Chunk.objects.create(document=self.document, chunk_index=0, text="a")
        with self.assertRaises(IntegrityError):
            Chunk.objects.create(document=self.document, chunk_index=0, text="b")

    def test_deleting_a_document_takes_its_chunks(self):
        Chunk.objects.create(document=self.document, text="a")
        self.document.delete(hard=True)
        self.assertEqual(Chunk.objects.count(), 0)


class IngestionRunTests(TestCase):
    def test_a_poll_that_found_nothing_is_still_on_record(self):
        source = Source.objects.create(name="WHO", slug="who", door=Source.Door.FEED)
        run = IngestionRun.objects.create(source=source, status=IngestionRun.Status.SUCCEEDED)
        self.assertEqual(run.documents_seen, 0)
        self.assertEqual(source.runs.count(), 1)
