"""One visitor turn, from their words to Ma'at's reply.

This is the conductor. Every model call lives in the `ai` package and every
row lives in the models; this file decides which happens when, and writes down
what happened.

    interpret the message
      social?            -> a warm reply, nothing recorded but the turn
      consent pending?   -> yes: look further (leg three), no: honest close
      a claim?           -> pin it down: read back, ask, or weigh
    weigh
      recall -> rerank -> judge -> decide
      below the gate     -> say so, ask permission to look further
      otherwise          -> the verdict, with its citations

Persisted every time: the turn, the claim, its rumour and mention, and the
evidence behind a verdict. Every visitor is answered at once; publication is
someone else's job and waits for the mention count.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import asdict, dataclass, field

from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from pgvector.django import CosineDistance

from ai import (
    compose_answer,
    consent_ask,
    decide,
    draft_claim,
    embed_texts,
    interpret,
    judge_passages,
    next_question,
    read_back,
    rerank_scored,
    social_reply,
)
from ai.interview import ClaimDraft
from ai.schemas import INSUFFICIENT, ClaimFields, History, Passage
from appsettings.models import AppSetting
from core.models import Country
from knowledge.geography import country_of
from knowledge.lookup import lookup as live_lookup
from knowledge.models import Chunk, Document, Source
from verification import retrieval
from verification.models import Claim, Conversation, Evidence, LiveLookup, Mention, Rumour, Turn

logger = logging.getLogger(__name__)

#: Two claims closer than this in cosine distance are the same rumour.
SAME_RUMOUR_DISTANCE = 0.10

#: How long a published article stands as the answer before Ma'at asks whether
#: a fresh report is the same matter or a new one.
#:
#: Counted in days since the rumour was last raised, not by calendar month. A
#: month boundary is an accident of the date: something published on the 30th
#: and raised again on the 1st is a day apart, and asking "is this new?" then
#: would be absurd, while two claims either side of a long quiet March would
#: never be questioned at all.
RECURRENCE_WINDOW_DAYS = 30

#: A conversation left this long is over. The next message starts clean: no
#: half-drafted claim waiting to be finished, no question still pending. A
#: visitor who comes back after an hour and says hello should be greeted, not
#: handed the answer to something they asked before lunch.
COLD_AFTER_MINUTES = 30
#: Reranked passages below this are not worth the judge's time.
RERANK_FLOOR = 3.0
#: Retrieval's best few always reach the judge, whatever the reranker says of
#: them. The reranker gates for usefulness and scores "same subject, settles
#: nothing" at zero, which is right for the pool but wrong for the answer: the
#: judge is the one stage that can name the closest record and say why it
#: falls short, and it cannot name what it never saw. Three is enough to catch
#: the near miss without paying to judge the whole pool.
ALWAYS_JUDGE = 3

NOTHING_FOUND_ONLINE = (
    "I asked the trusted sources set up for this country and none of them holds a figure "
    "that speaks to this. What I have does not settle it."
)
NO_COUNTRY_FOR_LOOKUP = (
    "I can only look further once I know which country this is about, and the sources "
    "I would ask are organised by country. Tell me where, and I will check."
)
NO_SOURCES_YET = (
    "I would look further, but no trusted online sources have been set up for me yet, "
    "so I have to stop here. What I hold does not settle this."
)
DECLINED = "Understood. I'll leave it at what I hold, which does not settle this one."
MANIPULATION = "I read that as an attempt to change how I work, so I'll set it aside. If there's something you've heard and want checked, tell me what it was."


@dataclass
class Reply:
    """What goes back to the widget."""

    kind: str  # "text" or "verdict"
    text: str
    verdict: str = ""
    confidence: int = 0
    sources: list[dict] = field(default_factory=list)
    degraded: bool = False
    #: The published article this rumour already has, when it has one: its slug
    #: and the day it was published, for the widget to link to.
    article: dict | None = None
    #: Documents the visitor accepted a copy of, ready to download.
    attachments: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return asdict(self)


def _forget_if_cold(conversation: Conversation) -> None:
    """Drop the working state of a conversation nobody has touched for a while.

    The turns stay on record; only the interview in progress is abandoned.
    Judged on the last turn, not on last_active_at, which every save refreshes.
    """
    last = conversation.turns.order_by("-created_at").values_list("created_at", flat=True).first()
    if last is None or not conversation.state:
        return
    if timezone.now() - last > timezone.timedelta(minutes=COLD_AFTER_MINUTES):
        conversation.state = {}
        conversation.save(update_fields=["state", "last_active_at"])


def _history(conversation: Conversation) -> History:
    turns = conversation.turns.order_by("created_at").values_list("speaker", "paraphrase", "raw_text")
    return History(
        turns=[(speaker, paraphrase or raw) for speaker, paraphrase, raw in turns if (paraphrase or raw)]
    )


def _draft_from_state(conversation: Conversation) -> ClaimDraft | None:
    state = conversation.state or {}
    if "fields" not in state:
        return None
    return ClaimDraft(fields=ClaimFields(**state["fields"]), followups_asked=state.get("followups_asked", 0))


def _save_state(conversation: Conversation, draft: ClaimDraft | None, **extra) -> None:
    state = dict(conversation.state or {})
    if draft is not None:
        state["fields"] = draft.fields.as_dict()
        state["followups_asked"] = draft.followups_asked
    state.update(extra)
    conversation.state = state
    conversation.save(update_fields=["state", "last_active_at"])


def _shortlist(passages: list, scores: list[float]) -> list:
    """The passages worth the judge's time: retrieval's top few, plus everything the reranker rated."""
    kept = {i for i, s in enumerate(scores) if s >= RERANK_FLOOR} | set(range(min(ALWAYS_JUDGE, len(passages))))
    return [passages[i] for i in sorted(kept, key=lambda i: (-scores[i], i))]


def _country_for(fields: ClaimFields) -> Country | None:
    """The country the claim is about, if it is about one Ma'at covers.

    The interpreter's `where` field is read first. Failing that, the claim
    itself is read for a covered country's name, demonym or major city, by the
    same rule that files feed items. A visitor who says "inflation in Nigeria"
    has named the country whether or not the interpreter copied it into the
    right field, and the offline interpreter never does.
    """
    where = (fields.where or "").strip()
    for token in ([where] if where else []) + [part.strip() for part in where.replace(",", " ").split()]:
        match = Country.active.filter(name__iexact=token).first() or (
            Country.active.filter(iso2__iexact=token).first() if len(token) == 2 else None
        )
        if match:
            return match
    return country_of(" ".join(part for part in (fields.what, fields.where, fields.who) if part))


def _record_turn(conversation: Conversation, speaker: str, *, raw: str = "", read=None, text: str = "") -> Turn:
    retention_days = AppSetting.current().raw_text_retention_days
    return Turn.objects.create(
        conversation=conversation,
        speaker=speaker,
        raw_text=raw,
        raw_expires_at=timezone.now() + timezone.timedelta(days=retention_days) if raw else None,
        intent=read.intent if read else "",
        paraphrase=read.paraphrase if read else text,
        is_manipulation=read.is_manipulation if read else False,
        is_social=read.is_social if read else False,
        is_farewell=read.is_farewell if read else False,
        expansions=list(read.expansions) if read else [],
        hypothetical=read.hypothetical if read else "",
        degraded=read.degraded if read else False,
    )


def _article_of(rumour: Rumour) -> dict | None:
    """The published article for this rumour, if it has one."""
    if rumour.status != Rumour.Status.PUBLISHED:
        return None
    return {"slug": rumour.slug, "statement": rumour.statement, "published_on": rumour.last_seen_at.date().isoformat()}


def _recurrence_ask(rumour: Rumour) -> str:
    """One question, when a settled matter resurfaces long afterwards."""
    when = rumour.last_seen_at.strftime("%-d %B %Y")
    return (
        f"This came up before. We weighed it on {when} and published what the record said. "
        "Is what you heard about something new, or the same matter coming round again?"
    )


def _rumour_for(claim: Claim) -> tuple[Rumour, float]:
    """The rumour this claim belongs to, found by meaning, or a new one."""
    if claim.embedding is not None:
        nearest = (
            Rumour.active.exclude(embedding__isnull=True)
            .annotate(distance=CosineDistance("embedding", claim.embedding))
            .order_by("distance")
            .first()
        )
        if nearest is not None and nearest.distance <= SAME_RUMOUR_DISTANCE:
            return nearest, 1.0 - float(nearest.distance)
    return _new_rumour(claim), 1.0


def _new_rumour(claim: Claim) -> Rumour:
    """A rumour of its own, never folded into an existing one."""
    base = slugify(claim.paraphrase)[:60].strip("-") or "rumour"
    return Rumour.objects.create(
        statement=claim.paraphrase,
        embedding=claim.embedding,
        slug=f"{base}-{uuid.uuid4().hex[:6]}",
        country=claim.where,
    )


def _recount(rumour: Rumour, *, threshold: int) -> None:
    """Recount who has raised this rumour, and publish it if enough have.

    Mentions and reporters are counted separately on purpose. The mention count
    is every raising of the rumour; the reporter count is how many different
    browsers did the raising, and it is the second one publication turns on. A
    rumour asked about nine times by one insistent person is not a rumour that
    is going around, and publishing it as though it were is how a verification
    site becomes the thing it exists to correct.

    A browser is a rough proxy for a person and a defeatable one: anybody who
    wants to can open three private windows. It is deliberately all we ask for.
    Nothing here waits for the reporters to be spread over time, so three
    browsers within a minute publish, which is what makes the behaviour
    demonstrable. Tighten it by raising the threshold in settings rather than
    by adding a rule here.
    """
    # Counted in Python rather than with a DISTINCT over both columns, which
    # would count one visitor twice the moment their session cookie changed
    # while the visitor cookie survived. The visitor key identifies a reporter
    # whenever there is one; the session key only stands in for conversations
    # recorded before visitor keys existed.
    keys = rumour.mentions.values_list(
        "claim__conversation__visitor_key", "claim__conversation__session_key"
    )
    reporters = len({visitor or f"session:{session}" for visitor, session in keys})
    rumour.mention_count = rumour.mentions.count()
    rumour.reporter_count = reporters
    fields = ["mention_count", "reporter_count", "verdict", "confidence", "last_seen_at"]

    # Withheld is a decision somebody made; the threshold does not overrule it.
    if reporters >= threshold and rumour.status == Rumour.Status.COLLECTING:
        rumour.status = Rumour.Status.PUBLISHED
        fields.append("status")

    rumour.save(update_fields=fields)


COPY_OFFER = "I have the document itself. Would you like a copy?"
COPY_DECLINED = "Of course. The citation above links to the publisher’s own page if you want it later."
COPY_SENT = "Here it is. This is the document the answer rests on, exactly as it was published."


def _shareable_documents(decision) -> list[Document]:
    """Cited documents Ma'at is allowed to hand over, in citation order.

    Both conditions matter. The flag is somebody's decision to release our
    copy, and archived bytes are what there is to release: a document cleared
    for sharing but never archived has nothing to send, and offering it would
    be a promise broken a turn later.
    """
    ids = [c.reference for c in decision.citations if c.reference]
    if not ids:
        return []
    chunks = Chunk.objects.filter(id__in=ids).select_related("document")
    by_chunk = {str(c.id): c.document for c in chunks}
    seen: set = set()
    out: list[Document] = []
    for citation in decision.citations:
        document = by_chunk.get(citation.reference)
        if document is None or document.pk in seen:
            continue
        if document.is_public and document.original:
            seen.add(document.pk)
            out.append(document)
    return out


def _attachment_payload(document: Document) -> dict:
    return {
        "id": str(document.pk),
        "title": document.title,
        "issuer": document.source.name if document.source_id else "",
        "filename": document.identifier.split("/")[-1] or document.title,
        "bytes": document.byte_size,
        "content_type": document.content_type,
        "url": reverse("api_chat_document", kwargs={"pk": document.pk}),
    }


def _sources_payload(decision) -> list[dict]:
    """Citations in the shape the widget shows: title, issuer, date, link, quote."""
    ids = [c.reference for c in decision.citations if c.reference]
    chunks = {str(c.id): c for c in Chunk.objects.filter(id__in=ids).select_related("document", "document__source")}
    payload = []
    for citation in decision.citations:
        chunk = chunks.get(citation.reference)
        document = chunk.document if chunk else None
        payload.append(
            {
                "title": document.title if document else citation.citation,
                "issuer": citation.citation,
                "date": document.published_at.isoformat() if document and document.published_at else "",
                "url": (document.url or "") if document else "",
                "quote": citation.quote,
                "highlight": [citation.highlight_start, citation.highlight_end]
                if citation.highlight_start is not None
                else None,
                "judgement": citation.judgement,
            }
        )
    return payload


@transaction.atomic
def _weigh(conversation: Conversation, draft: ClaimDraft, read, history: History) -> Reply:
    """Recall, rerank, judge, decide, and write it all down."""
    fields = draft.fields
    settings = AppSetting.current()
    country = _country_for(fields)

    vectors = embed_texts([fields.what])
    claim = Claim.objects.create(
        conversation=conversation,
        paraphrase=fields.what,
        embedding=vectors[0] if vectors else None,
        who=fields.who[:300],
        what=fields.what,
        when_text=fields.when[:200],
        when_unknown=fields.when_unknown or not fields.when,
        where=country,
        where_text=fields.where[:200],
        why=fields.why,
    )

    passages = retrieval.search(fields.what, read.search_variants if read else [], country=country)
    if passages:
        scores = rerank_scored(fields.what, [p.text for p in passages], gloss=read.paraphrase if read else "")
        if scores is not None:
            passages = _shortlist(passages, scores)
    judged = judge_passages(fields, passages) if passages else []
    decision = decide(judged, gate=settings.confidence_gate)

    state = conversation.state or {}
    rumour, match = (_new_rumour(claim), 1.0) if state.get("force_new_rumour") else _rumour_for(claim)

    # A settled matter raised again long afterwards: ask once whether it is the
    # same thing before folding it in, because the same words can describe a
    # different event a year later. Asked only of PUBLISHED rumours, since an
    # unpublished one has nothing to refer anybody to.
    stale = (timezone.now() - rumour.last_seen_at).days > RECURRENCE_WINDOW_DAYS
    if rumour.status == Rumour.Status.PUBLISHED and stale and not state.get("recurrence_asked"):
        _save_state(conversation, draft, recurrence_asked=True, recurrence_rumour=str(rumour.id))
        return Reply(kind="text", text=_recurrence_ask(rumour), article=_article_of(rumour))

    Mention.objects.create(
        rumour=rumour, claim=claim, verdict=decision.verdict, confidence=decision.confidence, match_score=match
    )
    rumour.verdict = decision.verdict
    rumour.confidence = decision.confidence
    _recount(rumour, threshold=settings.mentions_before_publish)
    for citation in decision.citations:
        if not citation.reference:
            continue
        Evidence.objects.update_or_create(
            rumour=rumour,
            chunk_id=citation.reference,
            defaults={
                "judgement": citation.judgement,
                "score": citation.confidence,
                "quote": citation.quote,
                "highlight_start": citation.highlight_start,
                "highlight_end": citation.highlight_end,
            },
        )

    if decision.below_gate and not decision.degraded and not state.get("looked_up"):
        # Say so, and ask before looking anywhere else.
        LiveLookup.objects.create(conversation=conversation, claim=claim)
        text = consent_ask(fields, found_something=decision.reason != "nothing_found", history=history)
        _save_state(conversation, draft, pending_consent=True, claim_id=str(claim.id))
        # The article travels on whichever reply answers them. Attaching it
        # only to the verdict path would hide the existing record from exactly
        # the visitors we could not settle it for, who need it most.
        return Reply(kind="text", text=text, article=_article_of(rumour))

    answer = compose_answer(fields, decision, history)
    conversation.state = {}
    conversation.save(update_fields=["state"])

    # Already published: answer them anyway, then point at the article. Every
    # visitor gets their answer, and a referral instead of one would be a worse
    # reply dressed up as tidiness. The mention still counts, because how often
    # a settled rumour keeps coming back is worth knowing.
    rumour.refresh_from_db(fields=["status", "slug", "statement", "last_seen_at"])
    article = _article_of(rumour)
    text = answer.text
    if article:
        text = f"{text}\n\nWe have published on this before, and the article has the full record."

    # Offer rather than attach. A file arriving unasked is presumptuous on a
    # metered connection, and the offer is one line the visitor can ignore.
    offerable = _shareable_documents(decision)
    if offerable:
        text = f"{text}\n\n{COPY_OFFER}"
        _save_state(conversation, None, pending_copy=[str(d.pk) for d in offerable])

    return Reply(
        kind="verdict",
        text=text,
        verdict=answer.verdict,
        confidence=answer.confidence,
        sources=_sources_payload(decision),
        degraded=answer.degraded,
        article=article,
    )


def _after_consent(conversation: Conversation, read, history: History) -> Reply:
    state = conversation.state or {}
    lookup = LiveLookup.objects.filter(conversation=conversation, consented__isnull=True).order_by("-asked_at").first()
    draft = _draft_from_state(conversation)
    claim_id = state.get("claim_id")

    if read.consent == "no":
        if lookup:
            lookup.consented = False
            lookup.consented_at = timezone.now()
            lookup.save(update_fields=["consented", "consented_at"])
        conversation.state = {}
        conversation.save(update_fields=["state"])
        return Reply(kind="verdict", text=DECLINED, verdict=INSUFFICIENT, confidence=0)

    # Yes. Leg three: ask the configured APIs for this country, store what they
    # say as documents, then weigh the claim again against the enlarged shelf.
    if lookup:
        lookup.consented = True
        lookup.consented_at = timezone.now()
        lookup.save(update_fields=["consented", "consented_at"])

    claim = Claim.objects.filter(pk=claim_id).first() if claim_id else None
    if draft is None or claim is None:
        conversation.state = {}
        conversation.save(update_fields=["state"])
        return Reply(kind="verdict", text=NO_SOURCES_YET, verdict=INSUFFICIENT, confidence=0)

    country = claim.where
    written = live_lookup(draft.fields.what, country) if country else []
    if lookup:
        lookup.sources.set({d.source for d in written})

    if not written:
        conversation.state = {}
        conversation.save(update_fields=["state"])
        text = NOTHING_FOUND_ONLINE if country else NO_COUNTRY_FOR_LOOKUP
        return Reply(kind="verdict", text=text, verdict=INSUFFICIENT, confidence=0)

    # The shelf is bigger now. Weigh again, this time with pending_consent
    # cleared so a second shortfall answers plainly instead of asking twice.
    conversation.state = {**(conversation.state or {}), "pending_consent": False, "looked_up": True}
    conversation.save(update_fields=["state"])
    return _weigh(conversation, draft, read, history)


def handle_message(conversation: Conversation, text: str) -> Reply:
    """Answer one visitor message. Always returns something to say."""
    _forget_if_cold(conversation)
    history = _history(conversation)
    read = interpret(text, history)
    _record_turn(conversation, Turn.Speaker.VISITOR, raw=text, read=read)
    settings = AppSetting.current()

    state = conversation.state or {}

    if state.get("pending_copy") and read.consent:
        # Answering the offer of a copy. The state is cleared either way, so a
        # declined offer is not made again on the next question.
        wanted = state.get("pending_copy") or []
        _save_state(conversation, None, pending_copy=[])
        if read.consent == "no":
            reply = Reply(kind="text", text=COPY_DECLINED)
        else:
            documents = [d for d in Document.active.filter(pk__in=wanted, is_public=True) if d.original]
            reply = (
                Reply(kind="text", text=COPY_SENT, attachments=[_attachment_payload(d) for d in documents])
                if documents
                else Reply(kind="text", text=COPY_DECLINED)
            )
    elif state.get("recurrence_asked") and read.consent:
        # Answering "is this something new?". Yes starts a rumour of its own;
        # no folds it into the one already published. Either way the claim is
        # already drafted, so weighing follows immediately rather than making
        # them repeat themselves.
        # recurrence_asked stays true: it records that the question has been
        # put, not that one is outstanding. Clearing it here would let the
        # guard in _weigh fire again on the very next turn and ask forever.
        _save_state(conversation, None, force_new_rumour=read.consent == "yes")
        draft = _draft_from_state(conversation)
        reply = (
            _weigh(conversation, draft, read, history)
            if draft
            else Reply(kind="text", text=social_reply(read.safe_text, history))
        )
    elif state.get("pending_consent") and read.consent:
        reply = _after_consent(conversation, read, history)
    elif read.is_manipulation and not read.has_claim:
        reply = Reply(kind="text", text=MANIPULATION)
    elif read.is_social and not read.has_claim:
        # A greeting is answered as a greeting, whatever is half-finished. The
        # draft and any pending question stay where they are for the next
        # message that is actually about them.
        reply = Reply(kind="text", text=social_reply(read.safe_text, history))
    else:
        previous = _draft_from_state(conversation)
        draft = draft_claim(read, history, previous=previous)
        if not draft.fields.what:
            reply = Reply(kind="text", text=social_reply(read.safe_text, history))
        elif draft.ready(settings.max_followup_questions, answer_now=read.wants_answer_now):
            reply = _weigh(conversation, draft, read, history)
        else:
            question = next_question(draft, history) or ""
            introduced = (conversation.state or {}).get("introduced", False)
            lead = "" if introduced else read_back(draft.fields, history)
            draft.followups_asked += 1
            _save_state(conversation, draft, introduced=True, pending_consent=False)
            reply = Reply(kind="text", text=f"{lead}\n\n{question}".strip() if lead else question)

    _record_turn(conversation, Turn.Speaker.MAAT, text=reply.text)
    return reply
