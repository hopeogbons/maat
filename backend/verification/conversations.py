"""What the dashboard is shown about the people who asked.

A conversation is the most sensitive thing Ma'at holds. Everything here is
built on that: a visitor is a cookie and nothing else, the exact words are
shown only while they are still retained, and nothing is served that would
let somebody put a name to a thread.

Threads, not rows. The widget starts a new conversation whenever a browser's
session cookie turns over, so one person over three weeks is several
conversations; grouping them by visitor key is what makes a returning
visitor visible at all, and it is the only thing the key is used for.
"""

from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.prompts import LANGUAGE_NAMES

from .models import Claim, Conversation, Turn

#: Threads per page when the caller does not say. The widest step of the
#: ladder the dashboard uses, so a caller that is not a browser gets the most.
PAGE_SIZE = 20

#: What a caller may ask for. An allowlist rather than a range, because page
#: size decides how much work one request does, and a free number is an
#: invitation to ask for a hundred thousand threads in one go. These are the
#: steps in frontend/src/dashboard/useRowsPerPage.ts and nothing else.
PAGE_SIZES = (6, 8, 12, 16, 20)

#: Conversations listed inside one thread before the rest are counted only.
VISITS_SHOWN = 20


def _visitor_of(conversation: Conversation) -> str:
    """The key a thread is grouped by. Falls back to the session for rows
    recorded before visitor keys existed, which is why it is not a column."""
    return conversation.visitor_key or f"session:{conversation.session_key}"


def _label(key: str) -> str:
    """A short, stable handle for a visitor: enough to tell two apart in a
    list, not enough to be worth stealing. The key itself never leaves here."""
    return key.removeprefix("session:")[:6].upper()


def _turn_payload(turn: Turn) -> dict:
    """One message. The exact words only while retention still covers them.

    After that the paraphrase stands in, and the view says so rather than
    showing a blank bubble: a thread that goes quiet on the visitor's side
    reads as a bug, and this is the retention policy working.
    """
    expired = bool(turn.raw_expires_at and turn.raw_expires_at <= timezone.now())
    said = "" if expired else turn.raw_text
    return {
        "id": str(turn.id),
        "speaker": turn.speaker,
        "said": said or turn.paraphrase,
        # True when what is shown is Ma'at's restatement, not the visitor's
        # own words: either they have expired or none were kept.
        "isParaphrase": not said,
        "expired": expired,
        "intent": turn.intent,
        "isManipulation": turn.is_manipulation,
        "degraded": turn.degraded,
        "at": turn.created_at.isoformat(),
    }


class ConversationsView(APIView):
    """Threads, newest activity first, each with its visits and its verdicts."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        page = max(0, _int(request.query_params.get("page"), 0))
        size = _int(request.query_params.get("pageSize"), PAGE_SIZE)
        size = size if size in PAGE_SIZES else PAGE_SIZE
        query = (request.query_params.get("q") or "").strip()[:200]
        keys = _visitor_keys(query)
        pages = max(1, -(-len(keys) // size))
        page = min(page, pages - 1)
        wanted = keys[page * size : (page + 1) * size]

        # Only this page's browsers are read in full. Grouping happens in
        # Python, so paginating the conversations instead would cut threads in
        # half at the page boundary and count the same visitor twice.
        conversations = list(
            Conversation.active.filter(_belonging_to(wanted))
            .annotate(turn_count=Count("turns", distinct=True))
            .order_by("-last_active_at")
        )
        verdicts = _verdicts_by_conversation([c.id for c in conversations])

        threads: dict[str, dict] = {}
        for conversation in conversations:
            key = _visitor_of(conversation)
            thread = threads.setdefault(
                key,
                {
                    "visitor": _label(key),
                    "visits": 0,
                    "turns": 0,
                    "questions": 0,
                    "languages": [],
                    "verdicts": {"verified": 0, "unverified": 0, "insufficient": 0},
                    "firstSeen": conversation.created_at.isoformat(),
                    "lastActive": conversation.last_active_at.isoformat(),
                    "conversations": [],
                },
            )
            counts = verdicts.get(conversation.id, {})
            thread["visits"] += 1
            thread["turns"] += conversation.turn_count
            thread["questions"] += sum(counts.values())
            for verdict, n in counts.items():
                thread["verdicts"][verdict] = thread["verdicts"].get(verdict, 0) + n
            if conversation.language and conversation.language not in thread["languages"]:
                thread["languages"].append(conversation.language)
            thread["firstSeen"] = min(thread["firstSeen"], conversation.created_at.isoformat())
            if len(thread["conversations"]) < VISITS_SHOWN:
                thread["conversations"].append(
                    {
                        "id": str(conversation.id),
                        "language": conversation.language,
                        "turns": conversation.turn_count,
                        "isClosed": conversation.is_closed,
                        "startedAt": conversation.created_at.isoformat(),
                        "lastActive": conversation.last_active_at.isoformat(),
                    }
                )

        rows = sorted(threads.values(), key=lambda t: t["lastActive"], reverse=True)
        return Response(
            {
                "threads": rows,
                "page": page,
                "pages": pages,
                "pageSize": size,
                # Totals are of everything, not of this page: a figure that
                # changed as you turned pages would be worse than no figure.
                "total": len(keys),
                "returning": _returning_total(),
                "query": query,
            }
        )


def _int(value, fallback: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _visitor_keys(query: str = "") -> list[str]:
    """Browsers that have asked, most recently active first, narrowed by `query`.

    One row per conversation is read, not per turn, and only two columns of
    it. That is what makes paging by browser affordable: the list is built
    once per request and sliced, and the expensive joins are then done for
    twenty browsers rather than all of them.

    Searching happens here rather than after grouping, because a match on any
    one conversation should bring back the whole browser it belongs to. A
    visitor who asked about school fees in March is found by "school" even if
    every later visit was about something else.
    """
    rows = Conversation.active.order_by("-last_active_at")
    if query:
        rows = rows.filter(_matching(query)).distinct()
    seen: dict[str, None] = {}
    for visitor, session in rows.values_list("visitor_key", "session_key"):
        seen.setdefault(visitor or f"session:{session}", None)
    return list(seen)


def _matching(query: str) -> Q:
    """What a search term is allowed to look at.

    Every word must match something, but not the same something: "hausa fees"
    finds a Hausa conversation about fees. Words are matched against what was
    said, what Ma\u2019at understood, the claim it produced, its verdict, the
    language, and the handle shown in the list, which is how somebody follows
    up a thread they can see on screen.

    The visitor key itself is matched only by its leading characters, the ones
    the handle shows. The whole key is never searchable and never leaves the
    server.
    """
    where = Q()
    for word in query.split():
        where &= (
            Q(turns__raw_text__icontains=word)
            | Q(turns__paraphrase__icontains=word)
            | Q(turns__intent__icontains=word)
            | Q(claims__what__icontains=word)
            | Q(claims__mention__verdict__icontains=word)
            | Q(claims__mention__rumour__statement__icontains=word)
            | Q(language__in=_language_codes(word))
            | Q(visitor_key__istartswith=word)
        )
    return where


def _belonging_to(keys: list[str]) -> Q:
    """Conversations belonging to any of `keys`, by visitor or by session.

    Two clauses because a key is either a visitor cookie or the session that
    stands in for one, and a session key must not be matched against the
    visitor column: they are different namespaces and a collision would put
    two people in one thread.
    """
    visitors = [k for k in keys if not k.startswith("session:")]
    sessions = [k.removeprefix("session:") for k in keys if k.startswith("session:")]
    where = Q(pk__in=[])
    if visitors:
        where |= Q(visitor_key__in=visitors)
    if sessions:
        where |= Q(visitor_key="", session_key__in=sessions)
    return where


def _language_codes(word: str) -> list[str]:
    """Codes a search word could mean, by code or by the name on screen.

    The list shows "Igbo", so "igbo" has to find it; the column holds "ig".
    Partial names count, so "pidgin" reaches Nigerian Pidgin without anybody
    having to type the country.
    """
    word = word.casefold()
    codes = [code for code, name in LANGUAGE_NAMES.items() if word in name.casefold()]
    if word in LANGUAGE_NAMES:
        codes.append(word)
    return codes


def _returning_total() -> int:
    """Browsers with more than one visit, across every page."""
    counts: dict[str, int] = {}
    for visitor, session in (
        Conversation.active.values_list("visitor_key", "session_key")
    ):
        key = visitor or f"session:{session}"
        counts[key] = counts.get(key, 0) + 1
    return sum(1 for n in counts.values() if n > 1)


def _verdicts_by_conversation(ids: list) -> dict:
    """How each conversation's claims were answered, counted per verdict."""
    rows = (
        Claim.active.filter(conversation_id__in=ids)
        .values("conversation_id", "mention__verdict")
        .annotate(n=Count("id"))
    )
    counts: dict = {}
    for row in rows:
        verdict = row["mention__verdict"]
        if verdict:
            counts.setdefault(row["conversation_id"], {})[verdict] = row["n"]
    return counts


class ConversationTranscriptView(APIView):
    """One conversation, message by message, and the claims it produced."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        conversation = Conversation.active.filter(pk=pk).first()
        if conversation is None:
            return Response({"detail": "No such conversation."}, status=404)

        turns = conversation.turns.order_by("created_at")
        claims = (
            Claim.active.filter(conversation=conversation)
            .select_related("mention", "mention__rumour")
            .order_by("created_at")
        )
        return Response(
            {
                "id": str(conversation.id),
                "visitor": _label(_visitor_of(conversation)),
                "language": conversation.language,
                "startedAt": conversation.created_at.isoformat(),
                "lastActive": conversation.last_active_at.isoformat(),
                "isClosed": conversation.is_closed,
                "turns": [_turn_payload(t) for t in turns],
                "claims": [
                    {
                        "what": claim.what,
                        "verdict": claim.mention.verdict if hasattr(claim, "mention") else "",
                        "rumour": claim.mention.rumour.statement if hasattr(claim, "mention") else "",
                        "rumourSlug": claim.mention.rumour.slug if hasattr(claim, "mention") else "",
                    }
                    for claim in claims
                ],
            }
        )
