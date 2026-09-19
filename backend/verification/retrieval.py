"""Recall over the corpus: what the judge gets to read.

The shape of a search:

  1. SCOPE.   Current chunks of current documents, and only documents that
              apply where the claim applies: global ones plus the claim's
              country. Before any similarity work.
  2. RECALL.  The claim and its variants (the interpreter's rewrites and its
              hypothetical answer) each run two retrievers over the scoped
              rows: pgvector cosine, and Postgres full text.
  3. FUSE.    Reciprocal rank fusion merges every list. No weights to tune. A
              document CARD in the pool pulls its document's best fragments in
              with it, then leaves: cards are navigation, never evidence.

What comes out is a pool of candidates for the reranker and the judge. Nothing
here is a verdict, and nothing here is ever shown to the visitor by itself.
"""

from __future__ import annotations

from collections import defaultdict

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import Q
from pgvector.django import CosineDistance

from ai import embed_texts
from appsettings.models import switched_on
from ai.schemas import Passage
from core.models import Country
from knowledge.models import Chunk

#: How many candidates each retriever contributes per query.
PER_RETRIEVER = 20
#: How many fused candidates go on to the reranker.
POOL = 20
#: Standard RRF smoothing constant: ranks near the top dominate without letting
#: rank one drown everything else.
RRF_K = 60
#: Bounded so a runaway interpreter cannot multiply retrieval work.
MAX_VARIANTS = 4
#: Fragments a card pulls in from its document.
CARD_FRAGMENTS = 3


def scoped(country: Country | None, *, global_only: bool = False):
    """The passages a claim may be weighed against.

    Global documents, and those of countries switched on in Settings. A country
    switched off is not searched even when the claim names it: what it holds is
    not yet vouched for, and a verdict must not lean on it.

    `global_only` is for a claim about a country outside coverage: the global
    shelf alone, never the covered countries' own documents, which are not
    about the place the visitor asked after.
    """
    rows = Chunk.active.filter(
        switched_on("document__country"), is_current=True, document__is_current=True, document__deleted_at__isnull=True
    )
    if global_only:
        rows = rows.filter(document__country__isnull=True)
    elif country is not None:
        rows = rows.filter(Q(document__country__isnull=True) | Q(document__country=country))
    return rows.select_related("document", "document__source")


def _vector_hits(rows, vector: list[float]) -> list[tuple[str, float]]:
    hits = (
        rows.exclude(embedding__isnull=True)
        .annotate(distance=CosineDistance("embedding", vector))
        .order_by("distance")
        .values_list("id", "distance")[:PER_RETRIEVER]
    )
    return [(str(pk), float(distance)) for pk, distance in hits]


def _text_hits(rows, text: str) -> list[str]:
    query = SearchQuery(text, config="english", search_type="websearch")
    # Ranked against a vector computed here rather than the stored column, so
    # a corpus whose stored vectors are still being filled is searchable today.
    hits = (
        rows.annotate(rank=SearchRank(SearchVector("retrieval_text", "text", config="english"), query))
        .filter(rank__gt=0)
        .order_by("-rank")
        .values_list("id", flat=True)[:PER_RETRIEVER]
    )
    return [str(pk) for pk in hits]


def search(
    claim: str,
    variants: list[str] | None = None,
    *,
    country: Country | None = None,
    global_only: bool = False,
) -> list[Passage]:
    """The candidate pool for a claim, best first, or [] on an empty corpus."""
    claim = (claim or "").strip()
    if not claim:
        return []
    rows = scoped(country, global_only=global_only)
    if not rows.exists():
        return []

    queries = [claim, *[v for v in (variants or []) if v][:MAX_VARIANTS]]
    vectors = embed_texts(queries)

    fused: dict[str, float] = defaultdict(float)
    for text, vector in zip(queries, vectors):
        for rank, (pk, _distance) in enumerate(_vector_hits(rows, vector)):
            fused[pk] += 1.0 / (RRF_K + rank + 1)
        for rank, pk in enumerate(_text_hits(rows, text)):
            fused[pk] += 1.0 / (RRF_K + rank + 1)
    if not fused:
        return []

    ordered = sorted(fused.items(), key=lambda item: -item[1])[:POOL]
    chunks = {str(c.id): c for c in rows.filter(id__in=[pk for pk, _ in ordered])}

    # Cards step aside for their document's best fragments.
    passages: list[Passage] = []
    seen: set[str] = set()
    for pk, score in ordered:
        chunk = chunks.get(pk)
        if chunk is None:
            continue
        if chunk.kind == Chunk.Kind.CARD:
            fragments = (
                rows.filter(document=chunk.document, kind=Chunk.Kind.FRAGMENT)
                .exclude(embedding__isnull=True)
                .annotate(distance=CosineDistance("embedding", vectors[0]))
                .order_by("distance")[:CARD_FRAGMENTS]
            )
            for fragment in fragments:
                if str(fragment.id) not in seen:
                    seen.add(str(fragment.id))
                    passages.append(_passage(fragment, score))
            continue
        if pk not in seen:
            seen.add(pk)
            passages.append(_passage(chunk, score))
    return passages


def _passage(chunk: Chunk, score: float) -> Passage:
    document = chunk.document
    return Passage(
        text=chunk.text,
        citation=document.source.name,
        reference=str(chunk.id),
        published=document.published_at.isoformat() if document.published_at else "",
        retrieval_score=score,
    )
