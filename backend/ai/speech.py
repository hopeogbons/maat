"""The ears and the mouth: a voice note into words, a reply into a voice note.

Voice changes nothing about how Ma'at thinks. A note is transcribed here and
the words then take the same road as typed text: the quarantined read, the
interview, the weighing. Nothing hears the audio but the transcriber, and the
audio itself is never stored; only the transcript is, as a turn, under the
same retention as typed words.

    audio bytes -> transcribe() -> Transcript(text, language)
    reply text  -> speak()      -> audio bytes, or None

Failure policy, the same as every other stage: offline, keyless, a network
error or an empty transcript degrade to None. The endpoint then says plainly
that it could not listen and invites typing. Speaking is optional on top of
text; when the mouth fails the visitor still reads the answer.

Languages: the transcriber is told, in words, which language the visitor
chose, so it does not have to guess from a short clip. Only languages the
provider knows are named; for the rest the clip is sent unlabelled and the
provider decides.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from django.conf import settings

from ai.provider import ProviderUnavailable, client, is_offline, model_for

logger = logging.getLogger(__name__)

#: How the ears are told what they are about to hear, by widget language
#: code. The transcriber takes the language as words in a prompt: given as a
#: code, Hausa and Yoruba are refused outright. Igbo and the Kenyan languages
#: still to come are absent on purpose: a wrong hint is worse than none.
TRANSCRIBE_HINTS = {
    "en": "English",
    "ha": "Hausa",
    "yo": "Yoruba",
    "sw": "Kiswahili",
    "pcm": "Nigerian Pidgin English",
}

#: How the mouth is told to speak, by widget language code. The speech model
#: takes plain-language direction; naming the language is what keeps Hausa
#: from being read with English vowels.
SPOKEN_LANGUAGES = {
    "en": "English",
    "ha": "Hausa",
    "yo": "Yoruba",
    "ig": "Igbo",
    "pcm": "Nigerian Pidgin",
    "sw": "Kiswahili",
}

#: The provider reads at most this many characters aloud in one call. Answers
#: are short by design; this is a guard, not a budget.
MAX_SPOKEN_CHARS = 4000

#: Formats the widget and, later, Telegram can play. Opus in an Ogg container
#: is what Telegram expects of a voice message; MP3 plays everywhere in a page.
SPEECH_FORMATS = {"mp3": "audio/mpeg", "opus": "audio/ogg"}


@dataclass(frozen=True)
class Transcript:
    text: str
    #: The language the provider heard, when it says; else the hint given.
    language: str = ""


def transcribe(audio: bytes, filename: str, *, language: str = "") -> Transcript | None:
    """The words in a voice note, or None when nothing could be heard."""
    if is_offline() or not audio:
        return None
    hint = TRANSCRIBE_HINTS.get(language, "")
    try:
        params = {
            "model": model_for("transcribe"),
            "file": (filename or "voice-note", audio),
            "response_format": "json",
        }
        if hint:
            params["prompt"] = f"The speaker is speaking {hint}. Write down exactly what is said, in {hint}."
        response = client(timeout=60.0).audio.transcriptions.create(**params)
    except ProviderUnavailable:
        return None
    except Exception:  # noqa: BLE001 - a listening failure must not fail the site
        logger.exception("transcription failed")
        return None
    text = (getattr(response, "text", "") or "").strip()
    if not text:
        return None
    heard = getattr(response, "language", "") or hint
    return Transcript(text=text, language=heard)


def spoken_form(text: str) -> str:
    """A reply as it should be read aloud: the words, without the addresses.

    Ma'at cites by naming the issuer and the date, so a URL in the text adds
    nothing spoken. Markdown never appears in a reply, but a stray marker
    would be read as punctuation, so it goes too.
    """
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"[*_#`>]+", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text).strip()
    return text[:MAX_SPOKEN_CHARS]


def speak(text: str, *, language: str = "", format: str = "mp3") -> bytes | None:
    """A reply read aloud, or None when the mouth is unavailable."""
    if format not in SPEECH_FORMATS:
        raise ValueError(f"unknown speech format {format!r}")
    words = spoken_form(text)
    if is_offline() or not words:
        return None
    spoken_in = SPOKEN_LANGUAGES.get(language, "the language of the text")
    instructions = (
        f"Speak in {spoken_in}. Calm, clear and unhurried, like a trusted public "
        "announcer reading a notice. Do not translate, add or leave out words."
    )
    try:
        response = client(timeout=60.0).audio.speech.create(
            model=model_for("speak"),
            voice=settings.OPENAI_SPEECH_VOICE,
            input=words,
            instructions=instructions,
            response_format=format,
        )
        audio = response.content
    except ProviderUnavailable:
        return None
    except Exception:  # noqa: BLE001 - a speaking failure must not fail the reply
        logger.exception("speech failed")
        return None
    return audio or None
