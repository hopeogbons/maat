"""The parts of the conversation that are not the verdict.

Greetings, thanks, small talk, reading the claim back, and asking permission to
look further. All in Ma'at's voice, all with a plain offline fallback so the
widget is never silent.
"""

from __future__ import annotations

import logging

from ai import prompts
from ai.provider import ProviderUnavailable, chat_text
from ai.schemas import ClaimFields, History

logger = logging.getLogger(__name__)

GREETING = "Hello. Heard something you're not sure about? Tell me what you heard and I'll check it against the record."

FALLBACK_SOCIAL = "Glad to help. If there's something you've heard and want checked, tell me what it was."

FALLBACK_CONSENT = (
    "I looked through the documents I hold and could not settle this one. "
    "There was nothing that speaks to it directly. "
    "Would you like me to look at my trusted sources online for this question? "
    "I'll only do that if you say yes, and only in sources I trust."
)


def greeting() -> str:
    """The opening line. Fixed on purpose: the first thing a visitor reads
    should be the same every time, and it is already in Ma'at's voice."""
    return GREETING


def social_reply(paraphrase: str, history: History | None = None) -> str:
    """A warm, brief reply to conversation that carries no claim."""
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + prompts.SOCIAL},
        *(history.as_messages(6) if history else []),
        {"role": "user", "content": paraphrase},
    ]
    try:
        return chat_text("light", messages, max_tokens=100, temperature=0.7, timeout=15.0)
    except ProviderUnavailable as exc:
        logger.warning("social reply degraded: %s", exc)
        return FALLBACK_SOCIAL


def read_back(fields: ClaimFields, history: History | None = None) -> str:
    """Read the claim back so the visitor can see it was understood."""
    known = {k: v for k, v in fields.as_dict().items() if v and k != "when_unknown"}
    fallback = f"So what you've heard is this: {fields.what}"
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + prompts.READ_BACK},
        *(history.as_messages(4) if history else []),
        {"role": "user", "content": f"What they told you: {known}"},
    ]
    try:
        return chat_text("light", messages, max_tokens=90, temperature=0.5, timeout=15.0)
    except ProviderUnavailable as exc:
        logger.warning("read back degraded: %s", exc)
        return fallback


def consent_ask(fields: ClaimFields, *, found_something: bool, history: History | None = None) -> str:
    """Tell them honestly what happened, then ask permission to look further.

    `found_something` distinguishes "nothing on this at all" from "something
    on the subject that does not settle it", which the person deserves to know.
    """
    situation = (
        "You found passages on the subject, but none of them settles the claim."
        if found_something
        else "You found nothing relevant to the claim at all."
    )
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + prompts.CONSENT_ASK},
        *(history.as_messages(4) if history else []),
        {"role": "user", "content": f"The claim: {fields.what}\nWhat happened: {situation}"},
    ]
    try:
        return chat_text("light", messages, max_tokens=160, temperature=0.4, timeout=15.0)
    except ProviderUnavailable as exc:
        logger.warning("consent ask degraded: %s", exc)
        return FALLBACK_CONSENT
