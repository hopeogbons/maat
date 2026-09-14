"""The recall gate: which passages deserve the judge's attention.

Recall is permissive on purpose: vector search and full-text search fused
together nominate far more than is useful. This step scores the pool for
usefulness to the claim, 0 to 10, in one listwise call, so the judge sees a
short list worth reading rather than everything that mentioned the subject.

This is still the FIRST of the design's two numbers. A high score here means
"worth judging", never "supports the claim". No verdict is ever read off it.
"""

from __future__ import annotations

import logging
import re

from ai import prompts
from ai.provider import ProviderUnavailable, chat_text, is_offline

logger = logging.getLogger(__name__)

#: Words that carry no meaning for the offline overlap gate.
STOPWORDS = frozenset(
    "a an and are as at be been but by for from has have if in into is it its of on or "
    "that the their there these they this to was were will with would you your not no".split()
)


def _stem(token: str) -> str:
    """A light stem: enough that "prices" and "price" meet, not a real stemmer."""
    if len(token) <= 4:
        return token
    if token.endswith("ies"):
        return token[:-3] + "y"
    if token.endswith(("sses", "shes", "ches", "xes", "zes")):
        return token[:-2]
    for suffix in ("ing", "ers", "er", "ed", "s"):
        if len(token) > len(suffix) + 3 and token.endswith(suffix):
            return token[: -len(suffix)]
    return token


def content_terms(text: str) -> set[str]:
    """The meaningful, lightly stemmed words of a text. The deterministic
    offline gate compares these between claim and passage."""
    return {
        _stem(token)
        for token in re.findall(r"[a-z0-9']+", text.lower())
        if len(token) > 2 and token not in STOPWORDS
    }


def rerank_scored(claim: str, texts: list[str], gloss: str = "") -> list[float] | None:
    """Score each candidate passage for usefulness to the claim, 0 to 10.

    Returns floats aligned with `texts`, or None when no reranker is available
    or its answer skipped half the pool. None is a real value to callers: it
    means "no model judged these", and retrieval falls back to its
    deterministic overlap gate rather than trusting scores nobody produced.
    """
    if not texts:
        return []
    if is_offline():
        return None

    numbered = "\n\n".join(f"[{i}] {text[:1600]}" for i, text in enumerate(texts))
    clarification = f"\n(Meaning: {gloss})" if gloss else ""
    prompt = f"{prompts.RERANK}\nCLAIM: {claim}{clarification}\n\nPASSAGES:\n{numbered}"
    try:
        answer = chat_text("rerank", [{"role": "user", "content": prompt}], max_tokens=240, temperature=0.0, timeout=20.0)
    except ProviderUnavailable as exc:
        logger.warning("rerank unavailable: %s", exc)
        return None

    scores = [0.0] * len(texts)
    seen: set[int] = set()
    for index, score in re.findall(r"(\d+)\s*:\s*(\d+(?:\.\d+)?)", answer):
        position = int(index)
        if position < len(texts) and position not in seen:
            seen.add(position)
            scores[position] = min(float(score), 10.0)
    # A judgement that skipped half the pool is not a judgement: the unjudged
    # would keep 0.0 and be dropped as if scored, which is silent discarding.
    if len(seen) * 2 < len(texts):
        return None
    return scores
