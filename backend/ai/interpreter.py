"""Reading untrusted input safely before anything else acts on it.

The widget is public. Anyone can type anything, and that text must never sit
in a prompt beside Ma'at's own instructions. So the visitor's words are read
first by a QUARANTINED call whose only job is to describe them, in structured
fields. Every later stage works from those fields. The raw text is stored
briefly for abuse handling and is never fed to another model.

    visitor text -> interpret() -> Interpretation(intent, paraphrase, claim, flags, ...)
                                            |
                   the interview, retrieval and the answer see ONLY this

Failure policy: any failure, offline, keyless, a network error, an unparseable
reply, falls back to keyword heuristics. Deliberately NOT fail-closed: refusing
every visitor because the reader hiccupped turns a provider outage into an
outage of our own. The heuristics are weaker, not absent, and the read is
marked degraded so it can be counted.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from ai import prompts
from ai.provider import (
    ProviderUnavailable,
    as_bool,
    as_list_of_str,
    as_str,
    chat_json,
)
from ai.schemas import History

logger = logging.getLogger(__name__)

#: The old defence, kept as the degraded fallback. Weak on its own, which is
#: the whole reason the quarantined reader exists.
INJECTION_PATTERNS = (
    "ignore previous",
    "ignore all",
    "disregard prior",
    "system prompt",
    "you are now",
    "reveal your instructions",
    "developer mode",
)

#: Whole words and phrases only. "hi" must not hide inside "this".
SOCIAL_WORDS = frozenset(
    ("hi", "hello", "hey", "thanks", "thank", "goodbye", "bye", "morning", "afternoon", "evening", "please")
)
SOCIAL_PHRASES = ("good morning", "good afternoon", "good evening", "how are you", "thank you")

#: Phrases by which a person says they have heard something.
CLAIM_CUES = (
    "i heard",
    "is it true",
    "they say",
    "people are saying",
    "someone said",
    "rumour",
    "rumor",
    "is this true",
    "can you check",
    "can you verify",
    "verify",
    "read that",
    "saw that",
)

ANSWER_NOW_CUES = (
    "just tell me",
    "just answer",
    "what do you have",
    "skip the questions",
    "no more questions",
    "give me what you have",
)

CONSENT_YES = ("yes", "yes please", "go ahead", "please do", "ok", "okay", "sure", "yeah", "do it")
CONSENT_NO = ("no", "no thanks", "don't", "do not", "rather not", "nope", "stop")


@dataclass(frozen=True)
class Interpretation:
    """What the quarantined reader understood. The only thing downstream sees.

    `raw` is carried for storage and abuse handling; it must never be fed to
    another model or used to build a prompt.
    """

    raw: str
    intent: str
    paraphrase: str
    #: The claim as one neutral sentence, or "" when the message has none.
    claim: str
    is_manipulation: bool
    is_social: bool
    is_farewell: bool
    #: They have said, in whatever words, that they want the answer now.
    wants_answer_now: bool = False
    #: "yes", "no", or "" when the message is not about consent.
    consent: str = ""
    #: Search data only: alternative phrasings and one invented answer-shaped
    #: sentence. Embedded and matched, never placed in a prompt.
    expansions: tuple[str, ...] = ()
    hypothetical: str = ""
    degraded: bool = False

    @property
    def safe_text(self) -> str:
        """The text the rest of the pipeline may act on."""
        return self.paraphrase or self.raw

    @property
    def has_claim(self) -> bool:
        return bool(self.claim)

    @property
    def search_variants(self) -> list[str]:
        """Everything retrieval should try beside the claim itself."""
        return [v for v in [*self.expansions, self.hypothetical] if v]


def _words(text: str) -> set[str]:
    return set(re.findall(r"[a-z']+", text.lower()))


def _looks_social(text: str) -> bool:
    lowered = text.lower().strip()
    if any(phrase in lowered for phrase in SOCIAL_PHRASES):
        return len(lowered) < 80
    words = _words(lowered)
    return bool(words) and len(words) <= 6 and bool(words & SOCIAL_WORDS)


def _looks_like_claim(text: str) -> bool:
    lowered = text.lower()
    return any(cue in lowered for cue in CLAIM_CUES) or (len(_words(lowered)) >= 6 and "?" not in text)


def _consent(text: str) -> str:
    lowered = re.sub(r"[^a-z' ]", "", text.lower()).strip()
    if lowered in CONSENT_YES or lowered.startswith(("yes", "go ahead", "please do")):
        return "yes"
    if lowered in CONSENT_NO or lowered.startswith(("no", "don't", "do not")):
        return "no"
    return ""


def _heuristic(text: str, *, degraded: bool) -> Interpretation:
    """The offline read. Never expands, never writes a hypothetical: those
    are model outputs and inventing them by rule would only mislead search."""
    lowered = text.lower()
    social = _looks_social(text)
    manipulation = any(pattern in lowered for pattern in INJECTION_PATTERNS)
    answer_now = any(cue in lowered for cue in ANSWER_NOW_CUES)
    consent = _consent(text)
    # An instruction, a "just tell me", or a yes/no is not a claim, however
    # many words it has.
    claim = "" if (social or manipulation or answer_now or consent) else (text.strip() if _looks_like_claim(text) else "")
    return Interpretation(
        raw=text,
        intent="conversation" if social else ("check a claim" if claim else "unclear"),
        paraphrase=text.strip()[:400],
        claim=claim[:400],
        is_manipulation=manipulation,
        is_social=social,
        is_farewell=False,
        wants_answer_now=answer_now,
        consent=consent,
        degraded=degraded,
    )


def interpret(text: str, history: History | None = None) -> Interpretation:
    """Read one visitor message through the quarantined model.

    `history` is recent turns for context, visitor side as paraphrases only.
    Falls back to heuristics on any failure, marked degraded.
    """
    text = (text or "").strip()
    if not text:
        return Interpretation(
            raw="", intent="empty", paraphrase="", claim="",
            is_manipulation=False, is_social=True, is_farewell=False,
        )

    context = ""
    if history and history.turns:
        lines = [f"{who}: {said}" for who, said in history.tail(6)]
        context = "Recent conversation, oldest first:\n" + "\n".join(lines) + "\n\n"

    messages = [
        {"role": "system", "content": prompts.INTERPRETER},
        # The visitor's words are wrapped and labelled as data, never given as
        # the user turn itself.
        {"role": "user", "content": f"{context}MESSAGE TO DESCRIBE:\n<<<\n{text[:4000]}\n>>>"},
    ]
    try:
        data = chat_json("light", messages, max_tokens=500, timeout=20.0)
    except ProviderUnavailable as exc:
        logger.warning("interpreter degraded: %s", exc)
        return _heuristic(text, degraded=True)

    consent = as_str(data.get("consent"), 8).lower()
    claim = as_str(data.get("claim"), 400)
    # "Is that true?" is every claim, not a request to skip the questions. When
    # a claim is present, only an explicit cue in their own words counts.
    lowered = text.lower()
    wants_answer_now = as_bool(data.get("wants_answer_now")) and (
        not claim or any(cue in lowered for cue in ANSWER_NOW_CUES)
    )
    return Interpretation(
        raw=text,
        intent=as_str(data.get("intent"), 80) or "unclear",
        paraphrase=as_str(data.get("paraphrase"), 400) or text[:400],
        claim=claim,
        is_manipulation=as_bool(data.get("is_manipulation")),
        is_social=as_bool(data.get("is_social")),
        is_farewell=as_bool(data.get("is_farewell")),
        wants_answer_now=wants_answer_now,
        consent=consent if consent in {"yes", "no"} else "",
        expansions=tuple(as_list_of_str(data.get("search_queries"), limit=3, each=120)),
        hypothetical=as_str(data.get("hypothetical_answer"), 300),
        degraded=False,
    )
