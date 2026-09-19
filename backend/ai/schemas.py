"""The structured shapes that pass between stages.

Plain dataclasses, frozen where a stage must not be able to edit what an
earlier one decided. No model imports: the AI package never touches the
database, so these carry text and numbers only.
"""

from __future__ import annotations

from dataclasses import dataclass, field

#: The three verdicts, matching verification.models.Verdict by value. Ma'at
#: never calls anything false: Unverified is as strong as the language gets.
VERIFIED = "verified"
UNVERIFIED = "unverified"
INSUFFICIENT = "insufficient"
VERDICTS = (VERIFIED, UNVERIFIED, INSUFFICIENT)

#: What a passage was judged to do to a claim. Matches
#: verification.models.Evidence.Judgement by value.
SUPPORTS = "supports"
CONTRADICTS = "contradicts"
SETTLES_NOTHING = "settles_nothing"
UNRELATED = "unrelated"
JUDGEMENTS = (SUPPORTS, CONTRADICTS, SETTLES_NOTHING, UNRELATED)

#: The five things the interview tries to pin down, in the order it asks.
W_FIELDS = ("what", "when", "where", "who", "why")


@dataclass(frozen=True)
class Passage:
    """A candidate piece of evidence, as the judge sees it.

    `citation` is the publishing body and travels with the text so the answer
    can name it. `reference` is whatever identifies the row upstream; the AI
    package never interprets it, only hands it back.
    """

    text: str
    citation: str
    reference: str = ""
    published: str = ""
    retrieval_score: float = 0.0


@dataclass(frozen=True)
class Citation:
    """One source named in an answer, with the sentence to highlight."""

    citation: str
    reference: str
    quote: str
    highlight_start: int | None
    highlight_end: int | None
    judgement: str
    confidence: int
    published: str = ""


@dataclass
class ClaimFields:
    """The five Ws as the interview currently has them. Empty means unknown."""

    what: str = ""
    when: str = ""
    where: str = ""
    who: str = ""
    why: str = ""
    #: True when the visitor has said they do not know the date. Recorded, not
    #: guessed: the answer will say so.
    when_unknown: bool = False

    def missing(self) -> list[str]:
        """The fields still worth asking about, in asking order.

        Only the claim and the country. `when` is never asked: a claim with no
        date is about the most recent event, and a visitor who means an
        earlier one says the year. `who` is in the claim when it matters.
        `why` is welcome when volunteered and useless to interrogate.
        """
        gaps = []
        if not self.what:
            gaps.append("what")
        if not self.where:
            gaps.append("where")
        return gaps

    def as_dict(self) -> dict[str, str | bool]:
        return {
            "what": self.what,
            "when": self.when,
            "where": self.where,
            "who": self.who,
            "why": self.why,
            "when_unknown": self.when_unknown,
        }


@dataclass
class History:
    """Recent turns, oldest first, as (speaker, text) with speaker in
    {"visitor", "maat"}. Visitor text is always the PARAPHRASE, never raw."""

    turns: list[tuple[str, str]] = field(default_factory=list)

    def tail(self, n: int = 8) -> list[tuple[str, str]]:
        return self.turns[-n:]

    def as_messages(self, n: int = 8) -> list[dict[str, str]]:
        role = {"visitor": "user", "maat": "assistant"}
        return [{"role": role.get(who, "user"), "content": text} for who, text in self.tail(n)]
