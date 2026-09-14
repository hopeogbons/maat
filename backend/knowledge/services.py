"""Taking one uploaded file into answerable knowledge.

Parse, situate, embed, store. The order is the safety property, and it is the
part most worth reading before changing anything here.

**Uploads version; they never overwrite.** Re-uploading a filename supersedes
the previous version and answers come from the newest, while every earlier
version stays on record. Knowledge is the asset: shrinking a circular must not
silently erase what the record used to say.

**Parsing and embedding both happen before the previous version is retired,
and both raise rather than degrade.** A scanned PDF or a provider outage then
fails the upload and leaves the working document exactly as it was. Done the
other way round, the old version is retired, replaced with nothing or with
unusable vectors, the upload reports success, and the document goes mute with
nobody told.

**Identical bytes cost nothing.** The same text yields the same passages, so
the vectors already stored are the vectors the provider would return. Reuse
them and make no call. The upload still becomes a version, because somebody
uploaded it deliberately and the history is a record of acts, not a diff.
"""

from __future__ import annotations

import hashlib

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from ai.embeddings import embed_documents
from ai.enrichment import generate_chunk_contexts
from knowledge.models import Chunk, Document, Source
from knowledge.parsing import DocumentUnreadable, build_chunks

#: Beyond this, contextual enrichment stops paying for itself: one model call
#: per passage on a 900-page report is a bill, not an improvement.
MAX_ENRICHED_CHUNKS = 200


def content_fingerprint(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _reusable(source: Source, identifier: str, fingerprint: str, expected: int):
    """Vectors from an identical earlier upload, or None.

    Matched on the content fingerprint, not the filename, and only when the
    passage count agrees: a parser change between the two uploads would mean
    the stored vectors no longer line up with the passages just produced.
    """
    previous = (
        Document.active.filter(source=source, identifier=identifier, fingerprint=fingerprint)
        .order_by("-version")
        .first()
    )
    if previous is None:
        return None
    chunks = list(previous.chunks.order_by("chunk_index"))
    if len(chunks) != expected or any(c.embedding is None for c in chunks):
        return None
    return chunks


def _store(**kwargs) -> Document:
    """Write the new version, retiring the old one; one retry if another writer got there first.

    Two pollers can reach the same source at once (a forced poll beside the
    scheduler). Both see the same highest version and one of them loses on the
    unique constraint. Losing once is a race; losing twice is a fault.
    """
    try:
        return _store_once(**kwargs)
    except IntegrityError:
        return _store_once(**kwargs)


@transaction.atomic
def _store_once(
    *,
    source: Source,
    identifier: str,
    title: str,
    data: bytes,
    fingerprint: str,
    country,
    is_public: bool,
    published_at,
    content_type: str,
    passages: list[dict],
    retrieval_texts: list[str],
    embeddings: list,
    embedding_model: str,
    user,
) -> Document:
    """Write the new version and retire the old one, in one transaction."""
    highest = Document.objects.filter(source=source, identifier=identifier).aggregate(n=Max("version"))["n"] or 0
    Document.objects.filter(source=source, identifier=identifier, is_current=True).update(is_current=False)
    Chunk.objects.filter(document__source=source, document__identifier=identifier).update(is_current=False)

    document = Document.objects.create(
        source=source,
        title=title,
        identifier=identifier,
        country=country,
        published_at=published_at,
        fetched_at=timezone.now(),
        fingerprint=fingerprint,
        version=highest + 1,
        is_current=True,
        byte_size=len(data),
        content_type=content_type,
        is_public=is_public,
        created_by=user if user and user.is_authenticated else None,
    )
    document.original.save(identifier, _as_file(data), save=True)

    Chunk.objects.bulk_create(
        [
            Chunk(
                document=document,
                chunk_index=index,
                text=passage["text"],
                retrieval_text=retrieval_texts[index],
                embedding=embeddings[index],
                embedding_model=embedding_model,
                page_number=passage["page"],
                heading_path=passage["heading_path"],
                is_current=True,
            )
            for index, passage in enumerate(passages)
        ]
    )
    return document


def _as_file(data: bytes):
    from django.core.files.base import ContentFile

    return ContentFile(data)


def ingest_document(
    *,
    source: Source,
    filename: str,
    data: bytes,
    country=None,
    is_public: bool = False,
    published_at=None,
    content_type: str = "",
    user=None,
) -> Document:
    """Parse, embed and store one document. Returns the new version.

    Raises DocumentUnreadable when nothing quotable came out of the file, and
    EmbeddingUnavailable when the provider could not be reached. Either way
    nothing has been written and the previous version is untouched.
    """
    identifier = (filename or "").strip().split("/")[-1][:1000] or "document"

    # Raises before anything is written.
    passages = build_chunks(identifier, data)
    fingerprint = content_fingerprint(data)

    reused = _reusable(source, identifier, fingerprint, len(passages))
    if reused is not None:
        retrieval_texts = [c.retrieval_text for c in reused]
        embeddings = [c.embedding for c in reused]
        embedding_model = reused[0].embedding_model
    else:
        # Contextual retrieval: a line situating each passage in its document,
        # prepended before embedding so a fragment carries the words people
        # ask for it with. A passage reading "the rate is 7.5%" is unfindable
        # by anyone searching for the levy it belongs to.
        texts = [p["text"] for p in passages]
        document_text = "\n\n".join(texts)[:20000]
        contexts = (
            generate_chunk_contexts(document_text, texts)
            if len(texts) <= MAX_ENRICHED_CHUNKS
            else [""] * len(texts)
        )
        # Empty context falls back to the passage itself, which is the
        # behaviour before enrichment existed rather than a hole.
        retrieval_texts = [
            f"{context.strip()}\n\n{text}" if context.strip() else "" for context, text in zip(contexts, texts)
        ]
        # Raises EmbeddingUnavailable rather than storing hash vectors that
        # would retrieve nothing and look like a working document.
        embeddings, embedding_model = embed_documents(
            [retrieval or text for retrieval, text in zip(retrieval_texts, texts)]
        )

    return _store(
        source=source,
        identifier=identifier,
        title=_title_from(identifier, passages),
        data=data,
        fingerprint=fingerprint,
        country=country if country is not None else source.country,
        is_public=is_public,
        published_at=published_at,
        content_type=content_type,
        passages=passages,
        retrieval_texts=retrieval_texts,
        embeddings=embeddings,
        embedding_model=embedding_model,
        user=user,
    )


def _title_from(identifier: str, passages: list[dict]) -> str:
    """The document's first heading, or its filename tidied up.

    A citation says the title, so "Gazette notice: commencement of the levy"
    earns its place over "gazette-levy-commencement.pdf".
    """
    for passage in passages[:3]:
        heading = (passage.get("heading_path") or "").split(" › ")[0].strip()
        if 3 <= len(heading) <= 200:
            return heading[:500]
    stem = identifier.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").strip()
    return (stem[:1].upper() + stem[1:])[:500] or identifier[:500]


__all__ = ["DocumentUnreadable", "content_fingerprint", "ingest_document"]
