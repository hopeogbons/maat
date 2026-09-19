"""The honest reply, with its citations.

The verdict is decided before this file is reached. What happens here is
wording: saying it plainly, naming the publishing body in the sentence, saying
when the date limits the answer, and never reaching for "false". Offline, a
plain templated reply carries exactly the same facts.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ai import prompts
from ai.judge import Decision
from ai.provider import ProviderUnavailable, chat_text
from ai.schemas import INSUFFICIENT, UNVERIFIED, VERIFIED, Citation, ClaimFields, History

logger = logging.getLogger(__name__)

VERDICT_PHRASE = {
    VERIFIED: "supported by the record",
    UNVERIFIED: "not supported by the record",
    INSUFFICIENT: "not something the record settles",
}

REASON_PHRASE = {
    "supported": "What I hold backs it up.",
    "contradicted": "What I hold says otherwise.",
    "conflict": "The sources I hold disagree with each other on this, so I cannot call it either way.",
    "settles_nothing": "I found material on the subject, but nothing that speaks to this specific point.",
    "nothing_found": "I found nothing in the record that bears on it.",
    "below_gate": "I found something that leans one way, but not firmly enough for me to rely on.",
    "no_judge": "I could not read the record properly just now, so I would rather say nothing than guess.",
}


@dataclass
class Answer:
    text: str
    verdict: str
    confidence: int
    reason: str
    citations: list[Citation] = field(default_factory=list)
    degraded: bool = False


def _fallback(fields: ClaimFields, decision: Decision) -> str:
    lead = f"What you heard is {VERDICT_PHRASE[decision.verdict]}."
    body = REASON_PHRASE.get(decision.reason, "")
    if decision.citations and decision.reason in {"supported", "contradicted"}:
        top = decision.citations[0]
        quoted = top.quote[top.highlight_start : top.highlight_end] if top.highlight_start is not None else ""
        body = f"{top.citation} says: “{quoted or top.quote[:160]}”" if quoted or top.quote else body
    date = "" if fields.when else " No date was given, so this rests on the most recent record; say the year if you meant an earlier one."
    return " ".join(part for part in (lead, body) if part) + date


def compose_answer(fields: ClaimFields, decision: Decision, history: History | None = None) -> Answer:
    """Write the reply in Ma'at's voice, from a decision already made."""
    fallback = _fallback(fields, decision)
    if decision.degraded:
        return Answer(fallback, decision.verdict, decision.confidence, decision.reason, decision.citations, True)

    evidence = "\n".join(
        f"- {c.citation}{' (' + c.published + ')' if c.published else ''}: {c.judgement}, "
        f"confidence {c.confidence}. Sentence relied on: “{c.quote[c.highlight_start:c.highlight_end] if c.highlight_start is not None else c.quote[:200]}”"
        for c in decision.citations[:4]
    ) or "- none"
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + prompts.ANSWER},
        *(history.as_messages(4) if history else []),
        {
            "role": "user",
            "content": (
                f"The claim: {fields.what}\n"
                f"When it is said to apply: {fields.when or 'not given, so the most recent event is meant'}\n"
                f"Verdict: {VERDICT_PHRASE[decision.verdict]}\n"
                f"Why: {decision.reason}\n"
                f"Judgement confidence: {decision.confidence}\n"
                f"Evidence:\n{evidence}\n\n"
                f"A plain version of the reply, to improve on: {fallback}"
            ),
        },
    ]
    try:
        text = chat_text("answer", messages, max_tokens=260, temperature=0.3, timeout=30.0)
    except ProviderUnavailable as exc:
        logger.warning("answer degraded: %s", exc)
        return Answer(fallback, decision.verdict, decision.confidence, decision.reason, decision.citations, True)

    # The one rule wording must never break, whatever the model did.
    lowered = text.lower()
    if any(word in lowered for word in (" false", "fake", "hoax", " a lie", "untrue")):
        logger.warning("answer used forbidden wording; falling back")
        text = fallback
    return Answer(text, decision.verdict, decision.confidence, decision.reason, decision.citations, False)
