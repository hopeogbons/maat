"""What a quoted sentence says, in the visitor's language.

The record is English and a quotation is shown as published, because the
highlighted sentence must match the document word for word. A visitor reading
in Hausa still needs to know what that sentence says, so its meaning goes
beside it. This is the one place a translation is made.

    excerpts (English) -> translate_excerpts() -> meanings, same order

Failure policy: offline, keyless, a network error or a short reply gives back
empty strings, and the card shows the English alone. A missing translation is
a gap, never an invented sentence.
"""

from __future__ import annotations

import logging

from ai import prompts
from ai.provider import ProviderUnavailable, as_str, chat_json

logger = logging.getLogger(__name__)

#: Excerpts per call. A verdict cites four passages at most.
MAX_EXCERPTS = 6

TRANSLATE = """\
You translate short excerpts from official documents into {language}, for a
reader who does not read English. Translate the meaning faithfully and
plainly. Keep every name, number, date and title exactly as written. Do not
add, explain or soften anything.

Reply with a single JSON object and nothing else:
{{"excerpts": ["<translation of excerpt 1>", "<translation of excerpt 2>", ...]}}
in the same order as given, one entry per excerpt.
"""


def translate_excerpts(excerpts: list[str], language: str | None = None) -> list[str]:
    """Each excerpt in the visitor's language, or "" where none could be made."""
    code = language or prompts.reply_language.get()
    name = prompts.LANGUAGE_NAMES.get(code, "")
    blanks = [""] * len(excerpts)
    if not excerpts or not name or code == "en":
        return blanks
    pool = excerpts[:MAX_EXCERPTS]
    numbered = "\n\n".join(f"[{i}] {text}" for i, text in enumerate(pool))
    messages = [
        {"role": "system", "content": TRANSLATE.format(language=name)},
        {"role": "user", "content": numbered},
    ]
    try:
        data = chat_json("light", messages, max_tokens=900, timeout=20.0)
    except ProviderUnavailable as exc:
        logger.warning("translation degraded: %s", exc)
        return blanks
    rows = data.get("excerpts")
    if not isinstance(rows, list):
        return blanks
    out = [as_str(row, 1200) if isinstance(row, str) else "" for row in rows[: len(pool)]]
    return out + [""] * (len(excerpts) - len(out))
