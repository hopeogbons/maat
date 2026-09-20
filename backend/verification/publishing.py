"""Turning a rumour that enough people raised into a page anyone can read.

Publication is decided in the engine, by counting reporters. This is what
happens after that decision: the article is written, tagged and dated here,
and it is the only place that writes one.

Kept out of the request that triggers it where possible, but run inline when
that request is the one that crossed the threshold: a demonstration where the
third person asks and nothing appears for a minute is a demonstration of
nothing. The model call is the slow part, and it is allowed to fail: an
article still appears, from the rumour's own words and its evidence, because
a page that exists plainly is better than a page that never arrives.
"""

from __future__ import annotations

import logging

from django.utils import timezone
from django.utils.text import slugify

from ai.answer import VERDICT_PHRASE
from ai.story import clean_tags, write_story

from .models import Article, Evidence, Rumour, Tag

logger = logging.getLogger(__name__)

#: Words a reader gets through in a minute, for the "3 min" mark on a card.
WORDS_PER_MINUTE = 200

#: The strongest few passages, which is what the page is built on. More than
#: this and the model writes a digest of the corpus instead of an answer.
EVIDENCE_LIMIT = 6


def publish(rumour: Rumour) -> Article:
    """Write, or rewrite, the public page for `rumour`.

    Idempotent by rumour, because a rumour has one page however many times it
    crosses the threshold: republishing refreshes the words and keeps the
    original publication date, so an article that was shared yesterday does
    not claim to be new today.
    """
    evidence = list(
        Evidence.objects.filter(rumour=rumour)
        .select_related("chunk__document", "chunk__document__source")
        .order_by("-score")[:EVIDENCE_LIMIT]
    )
    story = write_story(rumour.statement, VERDICT_PHRASE[rumour.verdict], _evidence_lines(evidence))

    title = story.get("title") or _plain_title(rumour.statement)
    summary = story.get("summary") or _plain_summary(rumour, evidence)
    body = story.get("body") or summary
    tags = story.get("tags") or clean_tags([])

    article, created = Article.objects.update_or_create(
        rumour=rumour,
        defaults={
            "slug": _unique_slug(rumour, title),
            "title": title,
            "summary": summary,
            "body": body,
            "verdict": rumour.verdict,
            "read_minutes": max(1, round(len(body.split()) / WORDS_PER_MINUTE)),
        },
    )
    if created or article.published_at is None:
        article.published_at = timezone.now()
        article.save(update_fields=["published_at"])
    article.tags.set(_tags(tags))
    logger.info("article %s for rumour %s (%s)", "written" if created else "refreshed", rumour.id, article.slug)
    return article


def _tags(names: list[str]) -> list[Tag]:
    """Tag rows for `names`, creating any the vocabulary has not needed yet."""
    tags = []
    for name in names:
        tag, _ = Tag.objects.get_or_create(slug=slugify(name), defaults={"name": name})
        tags.append(tag)
    return tags


def _evidence_lines(evidence: list[Evidence]) -> str:
    """What the article may rely on, one line per passage, with its publisher."""
    lines = []
    for item in evidence:
        document = item.chunk.document
        issuer = document.source.name if document.source_id else document.title
        published = document.published_at.date().isoformat() if document.published_at else "no date given"
        quote = item.quote[item.highlight_start : item.highlight_end] if item.highlight_start is not None else item.quote[:300]
        lines.append(f"- {issuer} ({published}), {item.judgement}, confidence {item.score}: “{quote.strip()}”")
    return "\n".join(lines)


def _plain_title(statement: str) -> str:
    """The rumour as its own headline, when no model wrote one."""
    title = " ".join(statement.split())
    if len(title) > 90:
        title = title[:87].rstrip(" ,;:") + "…"
    return title[:1].upper() + title[1:]


def _plain_summary(rumour: Rumour, evidence: list[Evidence]) -> str:
    """A summary from the record alone: what was raised and who spoke to it."""
    lead = f"This was raised by {rumour.reporter_count} people and weighed against the record."
    if not evidence:
        return f"{lead} No document held by Ma’at speaks to it, so the verdict is that the record does not settle it."
    issuers = []
    for item in evidence:
        document = item.chunk.document
        name = document.source.name if document.source_id else document.title
        if name and name not in issuers:
            issuers.append(name)
    return f"{lead} What it was weighed against: {', '.join(issuers[:3])}. The verdict is that it is {VERDICT_PHRASE[rumour.verdict]}."


def _unique_slug(rumour: Rumour, title: str) -> str:
    """A readable slug, kept once it exists so a shared link keeps working."""
    existing = Article.objects.filter(rumour=rumour).values_list("slug", flat=True).first()
    if existing:
        return existing
    base = slugify(title)[:200] or slugify(rumour.statement)[:200] or "verification"
    slug, n = base, 2
    while Article.objects.filter(slug=slug).exists():
        suffix = f"-{n}"
        slug, n = f"{base[: 200 - len(suffix)]}{suffix}", n + 1
    return slug
