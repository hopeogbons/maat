"""Pinning the claim down: who, what, when, where, why.

The structure is in what is EXTRACTED, never in how it is asked. The extractor
returns fields; the question that fills a gap is written by the model in
Ma'at's own voice, and only falls back to a plain sentence when offline.

Rules from the design: at most two follow-ups, the date matters most, and the
visitor can always say "just tell me what you have" and get the answer with
whatever is known. Not knowing the date is recorded as not knowing, never
guessed.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ai import prompts
from ai.interpreter import Interpretation
from ai.provider import ProviderUnavailable, as_bool, as_str, chat_json, chat_text
from ai.schemas import ClaimFields, History

logger = logging.getLogger(__name__)

#: What may be asked for, in order. Only these: the claim itself, and the
#: country when it cannot be deduced, because it decides which documents can
#: answer at all. The date is never asked; a claim with no date is about the
#: most recent event, and a visitor who means an earlier one says so. "Who"
#: is never asked; it is in the claim if it matters.
ASK_ORDER = ("what", "where")

#: Offline phrasing. Serviceable, never charming: the model writes the real ones.
FALLBACK_QUESTIONS = {
    "what": "Tell me what you heard, as near as you can to how it was said.",
    "when": "When is this supposed to have happened, or to be happening? An older rumour and a new one are different things, so the date changes what I look for.",
    "where": "Where is this about? A country is enough, a city or region if you know it.",
    "who": "Who is this said to be about, or who is supposed to have said it?",
}


@dataclass
class ClaimDraft:
    """The claim as the interview has it right now, and what to do next."""

    fields: ClaimFields = field(default_factory=ClaimFields)
    #: How many follow-ups have been asked so far in this conversation.
    followups_asked: int = 0
    degraded: bool = False

    @property
    def missing(self) -> list[str]:
        return [name for name in ASK_ORDER if name in self.fields.missing()]

    def ready(self, max_followups: int = 2, *, answer_now: bool = False) -> bool:
        """Whether to stop asking and weigh what there is.

        Ready when the claim itself is known and either nothing important is
        missing, the follow-up budget is spent, or the visitor asked for the
        answer now.
        """
        if not self.fields.what:
            return False
        if answer_now or self.followups_asked >= max_followups:
            return True
        return not self.missing

    @property
    def next_gap(self) -> str | None:
        gaps = self.missing
        return gaps[0] if gaps else None


def _merge(base: ClaimFields, update: dict) -> ClaimFields:
    """Newer answers fill gaps and may refine, but never blank a known field."""
    merged = ClaimFields(**base.as_dict())
    for name in ("what", "when", "where", "who", "why"):
        value = as_str(update.get(name), 400)
        if value:
            setattr(merged, name, value)
    if as_bool(update.get("when_unknown")):
        merged.when_unknown = True
    return merged


def draft_claim(
    interpretation: Interpretation,
    history: History | None = None,
    previous: ClaimDraft | None = None,
) -> ClaimDraft:
    """Update the claim with whatever the latest message added.

    The extractor sees the conversation and the neutral paraphrase, never the
    raw text. Offline, the paraphrase becomes the claim and nothing else is
    inferred: the fields stay empty rather than guessed.
    """
    draft = ClaimDraft(
        fields=ClaimFields(**previous.fields.as_dict()) if previous else ClaimFields(),
        followups_asked=previous.followups_asked if previous else 0,
    )
    if interpretation.claim and not draft.fields.what:
        draft.fields.what = interpretation.claim

    transcript = ""
    if history and history.turns:
        transcript = "\n".join(f"{who}: {said}" for who, said in history.tail(8))
    messages = [
        {"role": "system", "content": prompts.CLAIM_EXTRACTOR},
        {
            "role": "user",
            "content": (
                f"Known so far: {draft.fields.as_dict()}\n\n"
                f"Conversation:\n{transcript or '(none)'}\n\n"
                f"Latest message, summarised: {interpretation.safe_text}\n"
                f"Claim in the latest message, if any: {interpretation.claim or '(none)'}"
            ),
        },
    ]
    try:
        data = chat_json("light", messages, max_tokens=400, timeout=20.0)
    except ProviderUnavailable as exc:
        logger.warning("claim extractor degraded: %s", exc)
        draft.degraded = True
        if not draft.fields.what and interpretation.claim:
            draft.fields.what = interpretation.claim
        return draft

    draft.fields = _merge(draft.fields, data)
    return draft


def next_question(draft: ClaimDraft, history: History | None = None, *, after_read_back: bool = False) -> str | None:
    """The one question that fills the most important gap, in Ma'at's voice.

    Returns None when there is nothing left to ask. The caller counts the
    follow-up; this function only writes it. `after_read_back` means the
    claim has just been read back in the same reply, so the question must
    not say it all over again.
    """
    gap = draft.next_gap
    if gap is None:
        return None
    fallback = FALLBACK_QUESTIONS[gap]

    known = {k: v for k, v in draft.fields.as_dict().items() if v and k != "when_unknown"}
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + prompts.FOLLOW_UP},
        *(history.as_messages(6) if history else []),
        {
            "role": "user",
            "content": (
                f"What is known so far: {known or 'nothing yet'}\n"
                f"The missing thing to ask for: {gap}\n"
                f"A plain version of the question, to improve on: {fallback}"
                + (
                    "\nThe claim has just been read back to them in the sentence before this one. "
                    "Do not repeat any part of it; go straight to the question, in one sentence."
                    if after_read_back
                    else ""
                )
            ),
        },
    ]
    try:
        return chat_text("light", messages, max_tokens=120, temperature=0.6, timeout=20.0)
    except ProviderUnavailable as exc:
        logger.warning("follow-up degraded: %s", exc)
        return fallback
