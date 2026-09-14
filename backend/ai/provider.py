"""The one place that knows how to talk to the model provider.

Every other file in this package asks here for a client and a model name. A
provider change, a key rotation or a model upgrade is therefore one file, and
tests can point everything at the offline path by flipping one setting.

Roles, not model names, are what callers ask for:

    light    the everyday model: reading the visitor, the interview, greetings,
             situating contexts, document cards
    answer   the careful model: judging evidence and writing the verdict
    rerank   the recall gate

Resolved at call time, not import time, so override_settings works in tests.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

ROLES = ("light", "answer", "rerank")


class ProviderUnavailable(RuntimeError):
    """No key, offline mode, or the provider could not be reached."""


def is_offline() -> bool:
    """True when every stage must use its deterministic fallback."""
    return bool(getattr(settings, "AI_OFFLINE", False)) or not settings.OPENAI_API_KEY


def model_for(role: str) -> str:
    if role not in ROLES:
        raise ValueError(f"unknown model role {role!r}")
    return {
        "light": settings.OPENAI_MODEL,
        "answer": settings.OPENAI_ANSWER_MODEL,
        "rerank": settings.OPENAI_RERANK_MODEL,
    }[role]


def client(timeout: float = 30.0):
    """A configured OpenAI client, or ProviderUnavailable.

    Built per call rather than cached at import: the key can change between
    requests in tests, and the client is cheap.
    """
    if is_offline():
        raise ProviderUnavailable("AI is offline or no OPENAI_API_KEY is set")
    from openai import OpenAI

    return OpenAI(api_key=settings.OPENAI_API_KEY, timeout=timeout, max_retries=2)


def chat_text(
    role: str,
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 400,
    temperature: float = 0.4,
    timeout: float = 30.0,
) -> str:
    """One chat completion, returning the text. Raises ProviderUnavailable."""
    try:
        response = client(timeout).chat.completions.create(
            model=model_for(role),
            messages=messages,
            max_completion_tokens=max_tokens,
            temperature=temperature,
        )
        content = response.choices[0].message.content
    except ProviderUnavailable:
        raise
    except Exception as exc:  # noqa: BLE001 - every provider failure is one kind to callers
        raise ProviderUnavailable(str(exc)) from exc
    if not content:
        raise ProviderUnavailable("empty completion")
    return content.strip()


def chat_json(
    role: str,
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 600,
    temperature: float = 0.0,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """One chat completion that must return a JSON object.

    The provider is asked for JSON mode, and the reply is still parsed
    defensively: a fenced block or a stray preamble is tolerated, anything
    that is not an object raises, so no stage ever acts on prose it mistook
    for data.
    """
    try:
        response = client(timeout).chat.completions.create(
            model=model_for(role),
            messages=messages,
            max_completion_tokens=max_tokens,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or ""
    except ProviderUnavailable:
        raise
    except Exception as exc:  # noqa: BLE001
        raise ProviderUnavailable(str(exc)) from exc
    return parse_json_object(content)


_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def parse_json_object(text: str) -> dict[str, Any]:
    """The first JSON object in `text`, or ProviderUnavailable."""
    candidates = [text.strip()]
    fenced = _FENCE.search(text)
    if fenced:
        candidates.insert(0, fenced.group(1))
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        candidates.append(text[start : end + 1])
    for candidate in candidates:
        try:
            value = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(value, dict):
            return value
    raise ProviderUnavailable("model reply was not a JSON object")


def as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1"}
    return bool(value)


def as_str(value: Any, limit: int = 2000) -> str:
    if value is None:
        return ""
    return str(value).strip()[:limit]


def as_list_of_str(value: Any, limit: int = 5, each: int = 200) -> list[str]:
    if not isinstance(value, list):
        return []
    return [as_str(item, each) for item in value if as_str(item, each)][:limit]


def as_int(value: Any, low: int, high: int, default: int) -> int:
    try:
        number = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, number))
