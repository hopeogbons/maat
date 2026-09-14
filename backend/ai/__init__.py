"""Ma'at's AI: the parts of the engine that call a model.

Everything in here follows docs/verification-engine.md. The layout is the
order a claim travels:

    provider      one place that knows the client, the keys and the models
    prompts       the voice, and every prompt, in one file
    schemas       the structured shapes that pass between stages
    interpreter   the quarantined read of untrusted visitor text
    interview     pinning the claim down: who, what, when, where, why
    conversation  greetings, pleasantries, reading the claim back, asking consent
    embeddings    vectors for storage and for search, with an offline fallback
    enrichment    situating contexts and document cards, at ingestion
    rerank        the recall gate: which passages deserve judgement
    judge         the judgement: does this passage settle the claim, and how
    answer        the honest reply, with its citations

Two rules hold across every file. Nothing here touches the database: callers
pass text in and get structured results back, so each stage is testable on its
own. And every stage has a deterministic offline path, because a provider
outage must never become an outage of the site.
"""

from ai.answer import Answer, compose_answer
from ai.conversation import consent_ask, greeting, read_back, social_reply
from ai.embeddings import (
    EmbeddingUnavailable,
    current_embedding_model,
    embed_documents,
    embed_text,
    embed_texts,
)
from ai.enrichment import generate_chunk_contexts, generate_document_card
from ai.interpreter import Interpretation, interpret
from ai.interview import ClaimDraft, draft_claim, next_question
from ai.judge import Decision, Judgement, decide, judge_passages
from ai.provider import ProviderUnavailable, is_offline
from ai.rerank import content_terms, rerank_scored

__all__ = [
    "Answer",
    "ClaimDraft",
    "Decision",
    "EmbeddingUnavailable",
    "Interpretation",
    "Judgement",
    "ProviderUnavailable",
    "compose_answer",
    "consent_ask",
    "content_terms",
    "current_embedding_model",
    "decide",
    "draft_claim",
    "embed_documents",
    "embed_text",
    "embed_texts",
    "generate_chunk_contexts",
    "generate_document_card",
    "greeting",
    "interpret",
    "is_offline",
    "judge_passages",
    "next_question",
    "read_back",
    "rerank_scored",
    "social_reply",
]
