"""The public page of a rumour, written once the rumour has earned one.

A verified answer is written for the person who asked. An article is written
for someone who never asked: it has to say what is going around, what the
record says, and how to tell, to a reader who arrives cold from a search or a
shared link.

Tags come from a fixed vocabulary, never free text. A tag is only useful if
clicking it gathers every story about the same subject, and a model inventing
"Schools" here and "Education" there would scatter what belongs together.
"""

from __future__ import annotations

import logging

from . import prompts
from .provider import ProviderUnavailable, chat_json

logger = logging.getLogger(__name__)

#: The whole vocabulary. Add to it deliberately: each addition is a topic
#: readers can filter the landing page by, and a near-synonym of one already
#: here splits an audience instead of serving one.
TOPICS = [
    "Health",
    "Education",
    "Economy",
    "Elections",
    "Security",
    "Transport",
    "Energy",
    "Agriculture",
    "Environment",
    "Weather",
    "Employment",
    "Housing",
    "Technology",
    "Migration",
    "Justice",
    "Sport",
]

#: Beyond this many a filter is a list of everything, which filters nothing.
MAX_TAGS = 3

STORY = """\
Write the public page for a rumour enough people have raised that it is worth
answering in the open.

The reader did not ask the question. They arrived from a search or a shared
link, know nothing about this site, and may believe the rumour. Write for
them: what is going around, what the record says, and how they could have
checked it themselves.

Return JSON with exactly these keys:
  "title"   - the rumour as people actually say it, as a headline. Sentence
              case, no quotation marks, at most 90 characters.
  "summary" - two sentences. What the record says, and what follows from it.
  "body"    - three or four short paragraphs, separated by blank lines. What
              is circulating; what the cited documents say, naming the body
              that published each; what the verdict rests on; and what a
              reader should do or watch for. Plain sentences, no headings, no
              bullet points, no markdown.
  "tags"    - one to three topics, copied exactly from the list given. Choose
              the subject of the claim, not the verdict.

Never call anything false, fake, a hoax or a lie, here as anywhere. An
unverified claim is one the record does not support, and that is how you say
it. Do not invent a document, a date or a figure: everything factual comes
from the evidence given.
"""


def write_story(statement: str, verdict_phrase: str, evidence: str) -> dict:
    """Title, summary, body and tags for one rumour, or {} if unavailable."""
    messages = [
        {"role": "system", "content": prompts.VOICE + "\n" + STORY},
        {
            "role": "user",
            "content": (
                f"The rumour, as it was first put: {statement}\n"
                f"Verdict: {verdict_phrase}\n"
                f"Topics to choose from: {', '.join(TOPICS)}\n"
                f"Evidence:\n{evidence or '- none; no document in the corpus spoke to this'}"
            ),
        },
    ]
    try:
        data = chat_json("answer", messages, max_tokens=900, temperature=0.2, timeout=45.0)
    except ProviderUnavailable as exc:
        logger.warning("story unavailable: %s", exc)
        return {}
    return {
        "title": str(data.get("title") or "").strip()[:300],
        "summary": str(data.get("summary") or "").strip(),
        "body": str(data.get("body") or "").strip(),
        "tags": clean_tags(data.get("tags")),
    }


def clean_tags(raw) -> list[str]:
    """Only topics from the vocabulary, deduplicated, in the order given.

    Matched case-insensitively because a model asked for "Health" will
    sometimes return "health", and dropping that would lose a correct tag over
    a capital letter.
    """
    known = {topic.casefold(): topic for topic in TOPICS}
    tags: list[str] = []
    for item in raw if isinstance(raw, list) else []:
        topic = known.get(str(item).strip().casefold())
        if topic and topic not in tags:
            tags.append(topic)
    return tags[:MAX_TAGS]
