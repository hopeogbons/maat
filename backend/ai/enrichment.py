"""What ingestion adds to a document so that it can be found later.

Two things, both written by the everyday model, both retrieval machinery that
is never shown as the source's words.

A situating CONTEXT per chunk: a line or two placing the fragment in its
document, prepended before embedding and indexing. The fragment itself often
lacks the words people ask with; the context restores them.

One CARD per document: a compact index entry naming what the document is and
covers, in the words a person searching would type. It exists for the question
no single fragment matches, and when it lands in a shortlist it pulls its
document's best fragments in and then steps aside.

Both return "" on any failure. Enrichment must never be the reason an ingest
fails: a document without contexts is exactly the corpus before enrichment.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor

from ai.provider import ProviderUnavailable, chat_text, is_offline

logger = logging.getLogger(__name__)

#: The slice of a document a context call sees. Always contains the chunk.
CONTEXT_DOCUMENT_MAX_CHARS = 24_000
#: Past this many chunks a document gets no more contexts on the synchronous
#: path; the repair job can fill them in later.
CONTEXT_MAX_CHUNKS = 120
CONTEXT_CONCURRENCY = 6


def _window(document_text: str, chunk_text: str) -> str:
    """Head-only truncation asked the model to situate a page-180 chunk against
    pages 1 to 20, and it obligingly made a placement up. So the window is
    centred on the chunk."""
    if len(document_text) <= CONTEXT_DOCUMENT_MAX_CHARS:
        return document_text
    anchor = document_text.find(chunk_text[:120])
    if anchor < 0:
        return document_text[:CONTEXT_DOCUMENT_MAX_CHARS]
    start = max(0, anchor - CONTEXT_DOCUMENT_MAX_CHARS // 2)
    return document_text[start : start + CONTEXT_DOCUMENT_MAX_CHARS]


def _one_context(document_text: str, chunk_text: str) -> str:
    prompt = (
        "<document>\n"
        f"{_window(document_text, chunk_text)}\n"
        "</document>\n\n"
        "Here is the chunk to situate within the whole document:\n"
        "<chunk>\n"
        f"{chunk_text}\n"
        "</chunk>\n\n"
        "Give a short, succinct context that situates this chunk within the "
        "document, to improve search retrieval of the chunk. Name the "
        "document's subject and issuing body, and this chunk's place in it, "
        "using the words a person searching for this information would type. "
        "Answer only with the context and nothing else."
    )
    try:
        return chat_text("light", [{"role": "user", "content": prompt}], max_tokens=120, temperature=0.0)
    except ProviderUnavailable:
        return ""


def generate_chunk_contexts(document_text: str, chunk_texts: list[str]) -> list[str]:
    """One situating context per chunk, "" where none could be written."""
    if is_offline() or not chunk_texts:
        return ["" for _ in chunk_texts]
    eligible = chunk_texts[:CONTEXT_MAX_CHUNKS]
    with ThreadPoolExecutor(max_workers=CONTEXT_CONCURRENCY) as pool:
        contexts = list(pool.map(lambda chunk: _one_context(document_text, chunk), eligible))
    return contexts + ["" for _ in chunk_texts[CONTEXT_MAX_CHUNKS:]]


def generate_document_card(document_text: str, citation: str = "") -> str:
    """A compact index card for one document, "" offline or on failure."""
    if is_offline() or not document_text.strip():
        return ""
    issuer = f" It was issued by {citation}." if citation else ""
    prompt = (
        "<document>\n"
        f"{document_text[:CONTEXT_DOCUMENT_MAX_CHARS]}\n"
        "</document>\n\n"
        f"Write a compact index card for this document.{issuer} First line: what "
        "kind of document it is, its subject and its issuing body, by name. Then "
        "two to four lines listing what it covers, including its section names "
        "and any dates it gives. Use the plain words a person searching for this "
        "information would type. At most 120 words. Answer with the card only."
    )
    try:
        return chat_text("light", [{"role": "user", "content": prompt}], max_tokens=220, temperature=0.0)
    except ProviderUnavailable:
        return ""
