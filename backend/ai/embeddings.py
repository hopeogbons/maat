"""Vectors for storage and for search.

Two callers with opposite needs share one provider.

A QUERY may degrade: if the provider is down, a hashed vector that finds nothing
simply leads to an honest "not enough in the record", which is the right answer
when the system is half blind.

INGESTION must not. A document embedded with the hashing fallback while the
rest of the corpus holds provider vectors is not degraded, it is invisible: the
two occupy unrelated spaces and cosine distance between them means nothing.
Failing an upload is recoverable in seconds; a dead vector is discovered months
later when a visitor is told the record is silent on something it holds.
"""

from __future__ import annotations

import hashlib
import math
import re

from django.conf import settings

from ai.provider import ProviderUnavailable, client, is_offline

#: Must match knowledge.models.EMBEDDING_DIM. Imported there, not from there,
#: so this package stays free of database imports.
EMBEDDING_DIM = 1536
EMBEDDING_BATCH_SIZE = 96
HASH_EMBEDDING_MODEL = "hash-v1"


class EmbeddingUnavailable(RuntimeError):
    """The real embedder could not be reached and no substitute is acceptable."""


def _hash_embed(text: str) -> list[float]:
    """A deterministic bag-of-words vector. Offline stand-in for QUERIES only.

    Word hashing into fixed buckets, L2-normalised. Two texts sharing words
    land near each other, which is enough for tests and for a keyless machine
    to exercise the pipeline end to end. It is not semantic and must never be
    stored beside provider vectors.
    """
    vector = [0.0] * EMBEDDING_DIM
    for token in re.findall(r"[a-z0-9']+", text.lower()):
        digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % EMBEDDING_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def _provider_embed(texts: list[str]) -> list[list[float]]:
    response = client(timeout=60.0).embeddings.create(
        model=settings.OPENAI_EMBEDDING_MODEL,
        input=texts,
        dimensions=EMBEDDING_DIM,
    )
    rows = sorted(response.data, key=lambda row: row.index)
    vectors = [list(row.embedding) for row in rows]
    # A short reply used to be absorbed by zip() downstream, which silently
    # dropped the unembedded tail of a document.
    if len(vectors) != len(texts):
        raise ProviderUnavailable(
            f"embedding count mismatch: asked for {len(texts)}, received {len(vectors)}"
        )
    for vector in vectors:
        if len(vector) != EMBEDDING_DIM:
            raise ProviderUnavailable(f"embedding has {len(vector)} dimensions, expected {EMBEDDING_DIM}")
    return vectors


def _provider_embed_batched(texts: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        vectors.extend(_provider_embed(texts[start : start + EMBEDDING_BATCH_SIZE]))
    return vectors


def embed_texts(texts: list[str], *, strict: bool = False) -> list[list[float]]:
    """One vector per input, in order.

    `strict` decides what a provider failure means: the default returns hash
    vectors (right for a query), strict raises EmbeddingUnavailable (right for
    ingestion).
    """
    if not texts:
        return []
    if is_offline():
        if strict:
            raise EmbeddingUnavailable("AI is offline or no OPENAI_API_KEY is set")
        return [_hash_embed(t) for t in texts]
    try:
        return _provider_embed_batched(texts)
    except Exception as exc:  # noqa: BLE001 - every provider failure is one kind here
        if strict:
            raise EmbeddingUnavailable(str(exc)) from exc
        return [_hash_embed(t) for t in texts]


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]


def current_embedding_model() -> str:
    """The identifier `embed_documents` would stamp on a vector right now.

    Offline, the hash is genuinely the current embedder. Reporting the
    configured provider model instead would mark every offline-written row
    stale and re-embed the corpus for nothing.
    """
    return HASH_EMBEDDING_MODEL if is_offline() else settings.OPENAI_EMBEDDING_MODEL


def embed_documents(texts: list[str]) -> tuple[list[list[float]], str]:
    """Embed text destined for STORAGE. Returns (vectors, model identifier).

    Strict: a failure aborts the ingest rather than storing unusable vectors.
    Offline is the one exception, so a keyless development machine can still
    fill a corpus and search it, with every row honestly stamped as hashed.
    """
    if not texts:
        return [], current_embedding_model()
    if is_offline():
        return [_hash_embed(t) for t in texts], HASH_EMBEDDING_MODEL
    return embed_texts(texts, strict=True), settings.OPENAI_EMBEDDING_MODEL
