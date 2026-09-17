"""The judgement: does this passage settle the claim, and how sure are we.

This is where the design's rule lives. Similarity measures what a passage is
ABOUT; it cannot tell agreement from contradiction. So each shortlisted passage
is read against the claim and returns one of four answers, a confidence, and
the exact sentence the answer rests on. The verdict, and the 85% gate, come
from these numbers and never from retrieval.

Offline there is no judge, and `decide` says so: the verdict is Insufficient
evidence with `degraded` set, never a guess dressed as a finding.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ai import prompts
from ai.provider import ProviderUnavailable, as_int, as_str, chat_json, is_offline
from ai.schemas import (
    CONTRADICTS,
    INSUFFICIENT,
    JUDGEMENTS,
    SETTLES_NOTHING,
    SUPPORTS,
    UNRELATED,
    UNVERIFIED,
    VERIFIED,
    Citation,
    ClaimFields,
    Passage,
)

logger = logging.getLogger(__name__)

#: How many passages one judgement call reads. Past this the prompt grows
#: without the answer improving, and the tail is exactly what recall ranked
#: least useful.
JUDGE_POOL = 8


@dataclass(frozen=True)
class Judgement:
    """What one passage does to the claim."""

    passage: Passage
    judgement: str
    confidence: int
    sentence: str
    reason: str = ""

    @property
    def highlight(self) -> tuple[int | None, int | None]:
        """Where the relied-on sentence sits inside the passage, or nowhere.

        Found by exact match, so the highlight only ever marks words the source
        actually wrote. A sentence the model paraphrased is not highlighted.
        """
        if not self.sentence:
            return None, None
        start = self.passage.text.find(self.sentence)
        if start < 0:
            return None, None
        return start, start + len(self.sentence)

    def as_citation(self) -> Citation:
        start, end = self.highlight
        return Citation(
            citation=self.passage.citation,
            reference=self.passage.reference,
            quote=self.passage.text,
            highlight_start=start,
            highlight_end=end,
            judgement=self.judgement,
            confidence=self.confidence,
            published=self.passage.published,
        )


@dataclass
class Decision:
    """The verdict and why."""

    verdict: str
    confidence: int
    #: Why the verdict landed where it did, for the answer and for the record.
    #: One of: supported, contradicted, conflict, settles_nothing, nothing_found,
    #: below_gate, no_judge.
    reason: str
    citations: list[Citation] = field(default_factory=list)
    degraded: bool = False

    @property
    def below_gate(self) -> bool:
        return self.reason in {"settles_nothing", "nothing_found", "below_gate", "no_judge"}


def _claim_text(fields: ClaimFields) -> str:
    parts = [fields.what]
    if fields.when:
        parts.append(f"(when: {fields.when})")
    elif fields.when_unknown:
        parts.append("(when: not known)")
    if fields.where:
        parts.append(f"(where: {fields.where})")
    if fields.who:
        parts.append(f"(who: {fields.who})")
    return " ".join(parts)


def judge_passages(fields: ClaimFields, passages: list[Passage]) -> list[Judgement] | None:
    """Read each passage against the claim. None when no judge is available.

    None is a real value: the caller must not treat it as "nothing supports
    the claim", because nothing was read.
    """
    if not passages:
        return []
    if is_offline():
        return None

    pool = passages[:JUDGE_POOL]
    numbered = "\n\n".join(
        f"[{i}] (published by {p.citation}{', ' + p.published if p.published else ''})\n{p.text[:1800]}"
        for i, p in enumerate(pool)
    )
    messages = [
        {"role": "system", "content": prompts.JUDGE},
        {"role": "user", "content": f"CLAIM: {_claim_text(fields)}\n\nPASSAGES:\n{numbered}"},
    ]
    try:
        data = chat_json("answer", messages, max_tokens=1200, timeout=45.0)
    except ProviderUnavailable as exc:
        logger.warning("judge unavailable: %s", exc)
        return None

    rows = data.get("passages")
    if not isinstance(rows, list):
        return None
    by_index: dict[int, Judgement] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        index = as_int(row.get("index"), 0, len(pool) - 1, -1)
        if index < 0 or index in by_index:
            continue
        verdict = as_str(row.get("judgement"), 20).lower()
        if verdict not in JUDGEMENTS:
            verdict = UNRELATED
        by_index[index] = Judgement(
            passage=pool[index],
            judgement=verdict,
            confidence=as_int(row.get("confidence"), 0, 100, 0),
            sentence=as_str(row.get("sentence"), 1000),
            reason=as_str(row.get("reason"), 200),
        )
    # A reply that judged fewer than half the passages is not a judgement.
    if len(by_index) * 2 < len(pool):
        return None
    # Unjudged passages are recorded as unread, at zero, rather than invented.
    return [
        by_index.get(i, Judgement(passage=p, judgement=UNRELATED, confidence=0, sentence=""))
        for i, p in enumerate(pool)
    ]


def decide(judgements: list[Judgement] | None, gate: int = 85) -> Decision:
    """Turn the judgements into a verdict. The gate applies HERE and only here.

    Supports at or above the gate: Verified. Contradicts at or above the gate:
    Unverified. Both: the record disagrees with itself, which is reported as
    Insufficient evidence with the conflict named, because "pick the louder
    one" is not honesty. Nothing at the gate: Insufficient evidence, with the
    reason recorded so the answer can say which kind of nothing it was.
    """
    if judgements is None:
        return Decision(verdict=INSUFFICIENT, confidence=0, reason="no_judge", degraded=True)
    if not judgements:
        return Decision(verdict=INSUFFICIENT, confidence=0, reason="nothing_found")

    strong = [j for j in judgements if j.confidence >= gate]
    supports = [j for j in strong if j.judgement == SUPPORTS]
    contradicts = [j for j in strong if j.judgement == CONTRADICTS]

    def cite(rows: list[Judgement]) -> list[Citation]:
        return [j.as_citation() for j in sorted(rows, key=lambda j: -j.confidence)]

    if supports and contradicts:
        return Decision(
            verdict=INSUFFICIENT,
            confidence=min(max(j.confidence for j in supports), max(j.confidence for j in contradicts)),
            reason="conflict",
            citations=cite(supports + contradicts),
        )
    if supports:
        return Decision(VERIFIED, max(j.confidence for j in supports), "supported", cite(supports))
    if contradicts:
        return Decision(UNVERIFIED, max(j.confidence for j in contradicts), "contradicted", cite(contradicts))

    # Nothing at the gate. Say which kind of nothing.
    relevant = [j for j in judgements if j.judgement != UNRELATED]
    if not relevant:
        return Decision(INSUFFICIENT, 0, "nothing_found")
    best = max(relevant, key=lambda j: j.confidence)
    weak_but_decisive = [j for j in relevant if j.judgement in (SUPPORTS, CONTRADICTS)]
    reason = "below_gate" if weak_but_decisive else "settles_nothing"
    if weak_but_decisive:
        return Decision(INSUFFICIENT, best.confidence, reason, cite(weak_but_decisive[:3]))
    # "Settles nothing" confidence says how sure the judge is that a passage
    # settles nothing, which is no way to rank what to show. The closest
    # records are the ones retrieval ranked highest, so those come first.
    related = sorted((j for j in relevant if j.judgement == SETTLES_NOTHING), key=lambda j: -j.passage.retrieval_score)
    return Decision(INSUFFICIENT, best.confidence, reason, [j.as_citation() for j in related[:3]])
