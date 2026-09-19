"""The live channel: what Ma'at is doing, and the words as they are written.

A turn takes seconds, most of them before any word of the reply exists: the
quarantined read, the search, the weighing. The widget shows those stages as
they happen, then the reply as the model writes it, then the finished card.
This module is the one wire between the engine and whoever is listening.

    engine -> progress("searching") -> sink -> the endpoint -> the widget
    model  -> delta("Supported by ") -> sink -> ...

The sink is a context variable set by the streaming endpoint for the length
of one turn. When nothing is listening, which is every non-streamed call and
every test, emitting costs one lookup and does nothing. Nothing in the engine
behaves differently either way: the reply is built exactly as before, and the
stream is a side channel of the same words.
"""

from __future__ import annotations

from contextvars import ContextVar
from typing import Callable

Sink = Callable[[str, dict], None]

sink: ContextVar[Sink | None] = ContextVar("event_sink", default=None)

#: The stages a visitor sees named, in the order a verdict turn passes them.
STAGES = ("reading", "searching", "weighing", "writing")


def emit(kind: str, **data) -> None:
    listener = sink.get()
    if listener is not None:
        listener(kind, data)


def progress(stage: str) -> None:
    """Say which stage is under way."""
    emit("progress", stage=stage)


def delta(text: str) -> None:
    """Hand on words of the reply as they are written."""
    if text:
        emit("delta", text=text)
