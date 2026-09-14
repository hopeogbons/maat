"""The corpus: where Ma'at's answers come from.

Four tables, in the order a document travels through them.

    Source      who publishes, and how their material reaches us
    Document    one thing they published, at one version
    Chunk       a piece of it, embedded and indexed for search
    IngestionRun  one poll of one source, so a silent feed is visible

Two rules run through all of them.

Attribution is not decoration. A chunk knows its document, a document knows its
source, and the source is the body cited to the public when that chunk is used
to weigh a claim. Nothing is ever quoted without a name behind it.

Documents version, they never overwrite. Answers come from the current version
only, but what a body said in an earlier year stays on record with its date. In
a product about time-bound claims, deleting the past would be deleting evidence.
"""

from __future__ import annotations

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils.translation import gettext_lazy as _
from pgvector.django import HnswIndex, VectorField

from core.models import BaseModel

#: Dimensions of the embedding. Fixed by the model that writes them, so changing
#: it means re-embedding the corpus, not editing this number alone.
EMBEDDING_DIM = 1536


class Source(BaseModel):
    """A body whose material Ma'at trusts, and the door it arrives by.

    The name is the citation. When a chunk from this source is used to weigh a
    claim, this is what the public sees, so it is written the way the body
    writes it: "World Health Organization", not "who.int".

    Only institutional sources are configured. No newspapers.
    """

    class Door(models.TextChoices):
        UPLOAD = "upload", _("Direct upload")
        FEED = "feed", _("RSS or Atom feed")
        API = "api", _("Developer API")
        PAGES = "pages", _("Public web pages")
        CONNECTOR = "connector", _("Other connector")

    #: The citation. Shown to the public exactly as written here.
    #: Not unique: one body appears once per country it is narrowed to.
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    door = models.CharField(max_length=20, choices=Door.choices, default=Door.UPLOAD)
    #: Feed or endpoint address. Empty for uploads, which have no address.
    address = models.URLField(blank=True)
    #: Empty means the source speaks for everywhere. There is no "World" row to
    #: keep in step, so global is the absence of a country rather than a value.
    country = models.ForeignKey(
        "core.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sources",
        help_text=_("Leave empty for a source that applies globally."),
    )
    homepage = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    #: How often to poll, in minutes. Ignored for uploads.
    #: One line saying what this source carries, shown on its card.
    collection = models.CharField(max_length=300, blank=True)
    #: Health, Statistics, Humanitarian: what it is a source of.
    subject = models.CharField(max_length=60, blank=True)
    #: What a country code does here: general, by-country, or national.
    scope = models.CharField(max_length=16, default="general")
    #: How far the address itself has been proven: tested, documented, listed.
    verification = models.CharField(max_length=16, default="listed")
    #: Where the body's own mark is served from, and its brand colour for the
    #: monogram that stands in when there is no mark.
    logo_url = models.CharField(max_length=300, blank=True)
    brand = models.CharField(max_length=20, blank=True)
    short = models.CharField(max_length=8, blank=True)
    cadence_minutes = models.PositiveIntegerField(default=360)
    is_active = models.BooleanField(default=True)
    last_polled_at = models.DateTimeField(null=True, blank=True)
    #: What the server said last time, returned on the next request so it can
    #: answer "nothing changed" with an empty body. This is what makes polling
    #: hourly a courtesy rather than a cost: a feed that has not moved is a few
    #: hundred bytes of headers, not a download.
    http_etag = models.CharField(max_length=300, blank=True)
    http_last_modified = models.CharField(max_length=120, blank=True)
    #: Consecutive failures. Reset by any success. A source is not called
    #: unhealthy for one bad night, and is backed off rather than hammered.
    failure_count = models.PositiveSmallIntegerField(default=0)
    last_error = models.TextField(blank=True)

    #: How to authenticate, for API sources. A block shaped like one of:
    #:   {"type": "none"}
    #:   {"type": "api_key", "key": "...", "name": "X-Api-Key", "in": "header"|"query"}
    #:   {"type": "bearer", "token": "..."}
    #:   {"type": "basic", "username": "...", "password": "..."}
    #: Nothing in it is mandatory. Whatever is present is used; an empty block
    #: sends an unauthenticated request, which is right for most public data.
    auth = models.JSONField(default=dict, blank=True)
    #: Where the data lives in this API's response, so one connector reads
    #: every API and a new source needs a schema, not code:
    #:   {"items": "data.results",
    #:    "fields": {"title": ["fields.title", "title"], "body": "summary",
    #:               "date": "fields.date.created", "link": ["fields.url", "url"]},
    #:    "query": {"appname": "maat"}}
    #: Paths are dot-separated and may index lists ("data.0.name"). A field may
    #: give one path or a list of fallbacks tried in order. A field that resolves
    #: nowhere is null, never an error.
    schema = models.JSONField(default=dict, blank=True)
    #: A trimmed copy of what the API actually returned, kept from the first
    #: successful fetch so the schema can be written and corrected against the
    #: real shape rather than the documented one.
    response_sample = models.JSONField(null=True, blank=True)
    response_sample_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "door"]),
            models.Index(fields=["country"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def where(self) -> str:
        """The country this source speaks for, or Global."""
        return self.country.name if self.country_id else "Global"


class Document(BaseModel):
    """One thing a source published, at one version.

    `fingerprint` is the identity of the CONTENT, as opposed to the filename or
    the URL: re-fetching an unchanged page must not mint a version.

    `published_at` is the date the body put it out, which is what decides
    whether it can answer a claim about a given year. `fetched_at` is merely
    when we saw it, and the two are often years apart.
    """

    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=500)
    #: Filename for an upload, URL for anything pulled.
    identifier = models.CharField(max_length=1000)
    url = models.URLField(max_length=1000, blank=True)
    #: Defaults to the source's country at ingest, then may be narrowed per
    #: document: a global body still publishes country guidance.
    country = models.ForeignKey(
        "core.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="documents",
    )
    #: When the issuing body published it. Null when it does not say, which is
    #: recorded honestly rather than guessed.
    published_at = models.DateField(null=True, blank=True)
    fetched_at = models.DateTimeField(null=True, blank=True)
    #: SHA-256 of the original bytes.
    fingerprint = models.CharField(max_length=64, db_index=True)
    version = models.PositiveIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    #: Which parser produced the chunks. A corpus read by an older, worse parser
    #: is repairable from the archived bytes rather than silently wrong.
    parser_version = models.PositiveIntegerField(default=1)
    #: The bytes as they arrived, so a reparse never needs the network again.
    original = models.FileField(upload_to="documents/%Y/%m/", null=True, blank=True)
    #: Whether Ma'at may hand this copy to a visitor who asks for it.
    #:
    #: Off by default, and deliberately a decision somebody makes rather than
    #: an inference. A body publishing something openly is not the same as it
    #: granting us the right to redistribute the file, and the archived bytes
    #: are OUR copy: `url` already points at theirs, and a link to the
    #: publisher costs nobody anything. So this flag governs only the copy we
    #: hold, and a document without archived bytes can never be shared however
    #: it is flagged.
    is_public = models.BooleanField(default=False, db_index=True)
    byte_size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=120, blank=True)
    language = models.CharField(max_length=12, default="en")

    class Meta:
        ordering = ["-published_at", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "identifier", "version"], name="document_version_is_unique"
            )
        ]
        indexes = [
            models.Index(fields=["source", "is_current"]),
            models.Index(fields=["is_current", "published_at"]),
            models.Index(fields=["country"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} (v{self.version})"

    @property
    def citation(self) -> str:
        """Who the public is told this came from."""
        return self.source.name


class Chunk(BaseModel):
    """A piece of a document, embedded and indexed so it can be found.

    Two kinds share the table. A `fragment` is part of the document and may be
    quoted in an answer. A `card` is one per document: a written index entry
    naming what the document is and covers. A card in the shortlist pulls its
    document's best fragments in and then steps aside, so navigation never
    becomes an answer.

    `text` is what the source wrote and is the only thing ever shown. It is
    `retrieval_text`, which carries a line situating the fragment in its
    document, that search actually matches against. That line is machinery and
    must never be presented as the source's words.
    """

    class Kind(models.TextChoices):
        FRAGMENT = "fragment", _("Fragment")
        CARD = "card", _("Card")

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="chunks")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.FRAGMENT, db_index=True)
    chunk_index = models.PositiveIntegerField(default=0)
    text = models.TextField()
    retrieval_text = models.TextField(blank=True)
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)
    search_vector = SearchVectorField(null=True, blank=True)
    #: Where it sits in the original, so a citation can point at a page.
    page_number = models.PositiveIntegerField(null=True, blank=True)
    heading_path = models.CharField(max_length=500, blank=True)
    #: Which model wrote the embedding. Rows that disagree with the configured
    #: one are the ones a repair job re-embeds.
    embedding_model = models.CharField(max_length=120, blank=True)
    is_current = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["document", "chunk_index"]
        constraints = [
            models.UniqueConstraint(
                fields=["document", "kind", "chunk_index"], name="chunk_position_is_unique"
            )
        ]
        indexes = [
            models.Index(fields=["document", "is_current"]),
            GinIndex(fields=["search_vector"], name="chunk_search_vector_gin"),
            HnswIndex(
                name="chunk_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return f"{self.document.title} [{self.kind} {self.chunk_index}]"

    @property
    def citation(self) -> str:
        return self.document.source.name


class IngestionRun(BaseModel):
    """One poll of one source.

    Exists so a feed that quietly stopped returning anything is visible as a
    run that found nothing, rather than as an absence nobody notices.
    """

    class Status(models.TextChoices):
        RUNNING = "running", _("Running")
        SUCCEEDED = "succeeded", _("Succeeded")
        FAILED = "failed", _("Failed")

    source = models.ForeignKey(Source, on_delete=models.CASCADE, related_name="runs")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.RUNNING)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    documents_seen = models.PositiveIntegerField(default=0)
    documents_added = models.PositiveIntegerField(default=0)
    documents_updated = models.PositiveIntegerField(default=0)
    chunks_written = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["source", "-started_at"])]

    def __str__(self) -> str:
        return f"{self.source.name} {self.started_at:%Y-%m-%d %H:%M} ({self.status})"
