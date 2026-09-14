"""What a visitor asked, what the record said, and what Ma'at published.

The path a claim takes:

    Conversation -> Turn -> Claim -> Rumour -> Evidence -> Article
                              |
                          LiveLookup, when the corpus could not answer yet

A Claim is what one person brought. A Rumour is the thing itself, the same claim
however many people bring it and whatever words they use. Claims cluster onto a
Rumour by the meaning of their paraphrase, so five hundred people asking about
the same thing make one record with five hundred mentions, not five hundred
records.

Every visitor is answered at once. Publishing is separate and waits until enough
people have raised the same rumour to make it worth a public page.
"""

from __future__ import annotations

from django.db import models
from django.utils.translation import gettext_lazy as _
from pgvector.django import HnswIndex, VectorField

from core.models import BaseModel
from knowledge.models import EMBEDDING_DIM, Chunk


class Verdict(models.TextChoices):
    """Three, and only three. Ma'at never calls anything false."""

    VERIFIED = "verified", _("Verified")
    UNVERIFIED = "unverified", _("Unverified")
    INSUFFICIENT = "insufficient", _("Insufficient evidence")


class Conversation(BaseModel):
    """One visitor in the widget, from greeting to verdict."""

    #: Anonymous visitors are identified by their own browser session, never by
    #: an account: no one has to sign in to ask whether something is true.
    session_key = models.CharField(max_length=64, db_index=True)
    #: Opaque, random, and set from a cookie of its own rather than from the
    #: session, which is cleared far too readily to tell two reporters apart.
    #:
    #: Its only job is de-duplication: whether the same browser has raised a
    #: rumour before. It is never used to recognise anyone, to look up their
    #: history, or to join their questions across devices, and it carries
    #: nothing derived from the person. Not the network address either, which
    #: is useless for this: carrier-grade NAT puts thousands of separate people
    #: behind one address, and a moving handset takes several in an hour.
    visitor_key = models.CharField(max_length=64, blank=True, db_index=True)
    language = models.CharField(max_length=12, default="en")
    last_active_at = models.DateTimeField(auto_now=True)
    is_closed = models.BooleanField(default=False)
    #: Where the interview has got to: the claim fields so far, how many
    #: follow-ups have been asked, whether a consent question is outstanding.
    #: Small, per conversation, and rewritten every turn.
    state = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session_key", "-created_at"]),
            models.Index(fields=["visitor_key", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"Conversation {self.pk}"


class Turn(BaseModel):
    """One message, and what the quarantined reader made of it.

    `raw_text` is what the visitor typed. It is kept briefly for abuse handling
    and is never fed to another model or used to build a prompt. Everything the
    rest of the system acts on is in the structured fields beside it.
    """

    class Speaker(models.TextChoices):
        VISITOR = "visitor", _("Visitor")
        MAAT = "maat", _("Ma'at")

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="turns")
    speaker = models.CharField(max_length=10, choices=Speaker.choices)
    raw_text = models.TextField(blank=True)
    #: When the raw text is due to be cleared. The paraphrase outlives it.
    raw_expires_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # What the quarantined reader returned. Empty on Ma'at's own turns.
    intent = models.CharField(max_length=120, blank=True)
    paraphrase = models.TextField(blank=True)
    is_manipulation = models.BooleanField(default=False)
    is_social = models.BooleanField(default=False)
    is_farewell = models.BooleanField(default=False)
    #: Alternative phrasings and one invented answer-shaped sentence. Search
    #: data only: embedded and matched, never placed in a prompt.
    expansions = models.JSONField(default=list, blank=True)
    hypothetical = models.TextField(blank=True)
    #: The reader was unavailable and weaker heuristics stood in.
    degraded = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["conversation", "created_at"])]

    def __str__(self) -> str:
        return f"{self.speaker}: {self.paraphrase or self.raw_text[:60]}"


class Claim(BaseModel):
    """One person's rumour, pinned down as far as the interview managed.

    The five fields are what mass communication asks of any report. `when`
    matters most: it decides whether a document from an earlier year can answer
    at all. Not knowing is recorded as not knowing, never guessed.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="claims", null=True, blank=True
    )
    #: The neutral restatement. This, not the visitor's raw words, is what gets
    #: embedded, clustered and shown.
    paraphrase = models.TextField()
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)

    who = models.CharField(max_length=300, blank=True)
    what = models.TextField(blank=True)
    when_text = models.CharField(max_length=200, blank=True)
    when_date = models.DateField(null=True, blank=True)
    when_unknown = models.BooleanField(default=True)
    where = models.ForeignKey(
        "core.Country", on_delete=models.SET_NULL, null=True, blank=True, related_name="claims"
    )
    where_text = models.CharField(max_length=200, blank=True)
    why = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            HnswIndex(
                name="claim_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return self.paraphrase[:80]


class Rumour(BaseModel):
    """The thing itself, however many people bring it and in whatever words.

    `mention_count` is what decides publication. A rumour stays here, answered
    privately to each visitor, until enough people have raised it to be worth a
    public page.
    """

    class Status(models.TextChoices):
        COLLECTING = "collecting", _("Collecting")
        PUBLISHED = "published", _("Published")
        WITHHELD = "withheld", _("Withheld")

    #: The canonical wording, taken from the first claim and refined as more
    #: arrive.
    statement = models.TextField()
    embedding = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)
    slug = models.SlugField(max_length=220, unique=True)
    country = models.ForeignKey(
        "core.Country", on_delete=models.SET_NULL, null=True, blank=True, related_name="rumours"
    )
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    #: Every raising of this rumour, including the same person asking twice.
    mention_count = models.PositiveIntegerField(default=0)
    #: How many different browsers raised it. This is what publication turns
    #: on: "nine mentions" can be one determined person, "four reporters"
    #: cannot. Counted from the visitor key, falling back to the session key
    #: for conversations recorded before visitor keys existed.
    reporter_count = models.PositiveIntegerField(default=0)

    verdict = models.CharField(
        max_length=14, choices=Verdict.choices, default=Verdict.INSUFFICIENT, db_index=True
    )
    #: How sure the judgement was, 0 to 100. Gated in app settings, not here.
    confidence = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.COLLECTING)

    class Meta:
        ordering = ["-last_seen_at"]
        indexes = [
            models.Index(fields=["status", "-last_seen_at"]),
            models.Index(fields=["verdict"]),
            HnswIndex(
                name="rumour_embedding_hnsw",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self) -> str:
        return self.statement[:80]


class Mention(BaseModel):
    """One person raising a rumour, and the verdict they were given then.

    Kept per mention rather than only on the rumour: if the record later changes
    the verdict, what an earlier visitor was told stays on file.
    """

    rumour = models.ForeignKey(Rumour, on_delete=models.CASCADE, related_name="mentions")
    claim = models.OneToOneField(Claim, on_delete=models.CASCADE, related_name="mention")
    verdict = models.CharField(max_length=14, choices=Verdict.choices)
    confidence = models.PositiveSmallIntegerField(default=0)
    #: Similarity to the rumour it was folded into, for auditing the clustering.
    match_score = models.FloatField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["rumour", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.rumour.statement[:40]} ({self.verdict})"


class Evidence(BaseModel):
    """What a passage was judged to do to a claim, and the sentence that did it.

    Judgement is not similarity. A passage can sit close to a claim in embedding
    space and settle nothing about it, which is exactly the case this table
    exists to record honestly.

    `quote` is the passage shown to the public and `highlight_start` and
    `highlight_end` mark the sentence inside it that the judgement relied on.
    """

    class Judgement(models.TextChoices):
        SUPPORTS = "supports", _("Supports the claim")
        CONTRADICTS = "contradicts", _("Contradicts the claim")
        SETTLES_NOTHING = "settles_nothing", _("Same subject, settles nothing")
        UNRELATED = "unrelated", _("Unrelated")

    rumour = models.ForeignKey(Rumour, on_delete=models.CASCADE, related_name="evidence")
    chunk = models.ForeignKey(Chunk, on_delete=models.CASCADE, related_name="evidence")
    judgement = models.CharField(max_length=20, choices=Judgement.choices)
    #: How sure the judgement was, 0 to 100. The gate sits on this number.
    score = models.PositiveSmallIntegerField(default=0)
    #: Where recall put it before judgement. Recorded for tuning, never a verdict.
    retrieval_score = models.FloatField(default=0)
    quote = models.TextField(blank=True)
    highlight_start = models.PositiveIntegerField(null=True, blank=True)
    highlight_end = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-score"]
        constraints = [
            models.UniqueConstraint(fields=["rumour", "chunk"], name="evidence_is_unique_per_chunk")
        ]
        indexes = [models.Index(fields=["rumour", "-score"])]

    def __str__(self) -> str:
        return f"{self.judgement} ({self.score})"

    @property
    def citation(self) -> str:
        return self.chunk.document.source.name


class LiveLookup(BaseModel):
    """A consented search of configured sources, and what came back.

    Ma'at never reaches outside its own corpus without being asked. This is the
    record that it asked and what the answer was, kept whether permission was
    given or refused.
    """

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="lookups"
    )
    claim = models.ForeignKey(Claim, on_delete=models.CASCADE, related_name="lookups")
    asked_at = models.DateTimeField(auto_now_add=True)
    consented = models.BooleanField(null=True, blank=True)
    consented_at = models.DateTimeField(null=True, blank=True)
    sources = models.ManyToManyField("knowledge.Source", blank=True, related_name="lookups")
    found_anything = models.BooleanField(default=False)
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-asked_at"]

    def __str__(self) -> str:
        state = {True: "consented", False: "refused", None: "asked"}[self.consented]
        return f"Live lookup ({state})"


class Tag(BaseModel):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Article(BaseModel):
    """The public page for a rumour that enough people have raised."""

    rumour = models.OneToOneField(Rumour, on_delete=models.CASCADE, related_name="article")
    slug = models.SlugField(max_length=220, unique=True)
    title = models.CharField(max_length=300)
    summary = models.TextField(blank=True)
    body = models.TextField(blank=True)
    verdict = models.CharField(max_length=14, choices=Verdict.choices)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    read_minutes = models.PositiveSmallIntegerField(default=1)
    tags = models.ManyToManyField(Tag, blank=True, related_name="articles")

    class Meta:
        ordering = ["-published_at"]
        indexes = [models.Index(fields=["-published_at"]), models.Index(fields=["verdict"])]

    def __str__(self) -> str:
        return self.title
