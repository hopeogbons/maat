# Ma'at verification engine

The design we have agreed for how Ma'at reads a rumour, weighs it against the
record, and answers. Written down so the decisions survive between sessions.

Status: the foundations are built. `core` carries the shared base model and
the ISO catalogues, `accounts` the profile, `knowledge`, `verification` and
`appsettings` every model in section 7, and `ai` every model-calling stage in
sections 3 to 5, each with an offline fallback and a stub-tested provider path.
Not yet wired: the ingestion pipeline itself (parsing, Celery), retrieval over
the database, the widget endpoints, and publication. The widget is still
mocked and the dashboard runs on sample data.

## 1. What Ma'at is

A visitor has heard something. They bring it to Ma'at. Ma'at weighs the claim
against documents issued by reliable institutions and answers with a verdict and
its sources, or says honestly that it cannot.

Three principles govern everything below.

**Upfront always.** When the record is silent, Ma'at says so. When the date is
unknown, Ma'at says the answer is limited by that. There is no path where the
system covers a gap with confident prose.

**Internal first.** Every question is answered from Ma'at's own corpus before
anything external is considered. The open web is never a first move and is never
reached without the visitor's permission.

**No agent, ever.** There is no human in the loop and no escalation. Every path
ends in a published, honest answer, and the citations behind it are public.

English only in this iteration. Translation of the answer path comes later. The
site's six-language interface is unaffected.

## 2. The three legs

1. **The conversation.** A visitor-facing interview that reads untrusted input
   safely, elicits the facts of the claim, and returns a verdict with evidence.
2. **Ingestion.** One pipeline that takes documents from every source we trust,
   however they arrive, and turns them into searchable, attributed knowledge.
3. **Live lookup.** A bounded, consented search of configured sources when the
   corpus cannot answer yet.

## 3. Leg one: the conversation

### 3.1 Reading untrusted input

The widget is public. Anyone can type anything. The visitor's words never enter
a prompt alongside Ma'at's own instructions.

A quarantined model reads the message first, told plainly that the text is data
to be described and never instructions to obey. It returns structured fields
only. Everything downstream works from those fields.

The fields we need, adapted from the customer support interpreter:

- `intent`, a few words naming what they want
- `paraphrase`, the claim restated neutrally, no commands, no URLs
- `is_manipulation`, `is_social`, `is_farewell`
- `search_queries`, two or three alternative phrasings of the same claim
- `hypothetical_answer`, one invented answer-shaped sentence used only to find
  similar real sentences

Failure is not fail-closed. If the interpreter is offline or unparseable, weaker
keyword heuristics stand in and the read is logged as degraded. A provider
outage must not become an outage of the whole site.

The raw text is never fed to another model or used to build a prompt.

### 3.2 The interview

Ma'at is conversational and stays about its own business, the way the customer
support assistant does. It greets, invites the rumour, and then works to pin the
claim down before weighing it.

The flow:

1. Greet, and invite the claim. "Heard something? Tell me what you heard."
2. Read the claim back in a sentence or two, so the visitor can see it was
   understood and correct it if not.
3. Ask what is missing, at most two follow-up questions.
4. Weigh and answer.

What Ma'at is trying to fill in is the standard set: **who, what, when, where,
why**. The date matters most, because it decides whether a document from an
earlier year can answer at all. A claim about a policy in 2019 and the same
claim about 2026 are different claims.

Two rules keep the interview from becoming an interrogation. It never asks more
than two follow-ups, and the visitor can always say "just tell me what you have"
and get the answer immediately with whatever is known.

If the visitor does not know when the rumour started, Ma'at answers anyway, says
plainly that the date is unknown, and says the answer is limited by that.

Country is asked in conversation when it matters, never inferred from the
visitor's network address. It is what selects country-limited sources.

### 3.3 The claim record

The interview produces one structured record, and that record is what the rest
of the system acts on:

```
claim:      the neutral paraphrase
who:        person, body or group named
what:       the assertion itself
when:       date or period, or explicitly unknown
where:      country or region, or explicitly unknown
why:        stated reason or motive, if any
language:   English for now
```

### 3.4 Verdicts

Three, and only three.

| Verdict | Meaning |
| --- | --- |
| Verified | The record supports the claim. |
| Unverified | The record speaks and does not support the claim. |
| Insufficient evidence | The record is silent, or too weak to settle it. |

Ma'at never calls anything false. Unverified is as strong as the language gets.
Colours stay muted green, amber and grey. No red anywhere.

### 3.5 Confidence: two numbers, not one

This is the most important decision in the design.

Cosine similarity measures what a passage is **about**. It cannot tell agreement
from contradiction. "HIV funding stops next year" and "we will fight HIV next
year" sit close together in embedding space and mean opposite things. Raising a
similarity threshold to 100% does not fix this. It only matches near-verbatim
restatements, so Ma'at finds almost nothing and goes silent on exactly the
rumours it exists to weigh.

So retrieval and judgement are separate steps with separate numbers.

**Recall.** Vector search plus full-text search plus fusion, kept deliberately
permissive. Its only job is to put the right paragraphs in front of the judge.
No verdict is ever read off this number.

**Judgement.** Each shortlisted passage is checked against the claim and returns
one of four answers:

- supports the claim
- contradicts the claim
- about the same subject but settles nothing
- unrelated

It also returns the exact sentence it relied on.

**The 85% gate sits on the judgement, never on similarity.** Below it, Ma'at
says so honestly and offers to look further. On the HIV example the judgement
returns "same subject, settles nothing", and the honest output is Insufficient
evidence even though similarity was high.

### 3.6 Showing the evidence

Citations are public. The visitor sees the passage Ma'at relied on, with the
supporting sentence highlighted inside it.

The highlighted span is the sentence the judgement actually used, not a keyword
match, so the colour marks real evidence rather than coincidence.

Model-written material is never presented as a source's words. The situating
context written during ingestion is retrieval machinery and stays internal.

Public quotation is a short extract plus a link to the original, never a whole
document.

### 3.7 Attribution

The citation is whoever published the material.

- Documents Ma'at uploads or authors cite **Ma'at**.
- Anything arriving through a feed, an API or another external connection cites
  **the publishing body**, for example the World Health Organization.

Attribution travels with the content, so the same passage carries the same
citation wherever it surfaces later.

Multiple citations are expected and are laid out cleanly rather than as a dump.

## 4. Leg two: ingestion

One pipeline. Everything we trust flows through it, whatever door it came in by.

### 4.1 The doors

| Door | How it arrives |
| --- | --- |
| Direct upload | Staff upload a file in the dashboard. |
| RSS or Atom feed | A configured feed, polled on a schedule. |
| Developer API | A configured endpoint we pull structured content from. |
| Other connectors | Added as reliable sources warrant. |

All of them are configured in the dashboard and run on Celery workers with a
scheduler. Nothing is pulled from a source that has not been configured.

### 4.2 Source configuration

Each source records:

- the publishing body, which becomes the citation
- the door it arrives by, and its address
- **scope: global, or limited to a named country**
- polling cadence
- whether it is currently active

Only reliable institutional sources are configured. No newspapers. Trusted
sources need no further approval: what they publish goes through ingestion and
becomes answerable knowledge.

We honour robots.txt and rate limit politely.

### 4.3 What the pipeline does

Borrowed from the customer support knowledge app, which already does this well.

**Parse by format, not by ruler.** Markdown splits on its own headings. HTML on
its semantic tags. PDF page by page in layout mode so every chunk knows its page
number, with vision transcription for scanned pages that have no text layer.
DOCX walks the body in order so Word headings become sections and tables stay
with the section they belong to. Spreadsheets and CSV keep one row per line with
headers repeated. JSON and YAML flatten to one `a.b.c: value` line per leaf.
Anything else splits on sentence boundaries.

**Situate every chunk.** A model writes a line or two placing each fragment in
its document, and that is what retrieval matches against. It is never shown as
the source's words.

**One card per document.** A model-written index entry naming what the document
is and covers. Cards are recalled through the same search but never returned as
an answer: a card in the shortlist pulls its document's best fragments in and
then steps aside.

**Version, never overwrite.** Each ingest of the same document becomes version
N plus 1. Old rows stay, flagged not current. Answers come from current
knowledge only, but what an institution said in 2019 remains on record with its
date, which matters in a product about time-bound claims.

**Stamp the parser version.** Every row records the parser that produced it, so
a corpus parsed by an older reader is repairable from the archived original
bytes rather than silently wrong.

**A file that yields nothing raises rather than returning empty**, so an empty
parse can never retire working knowledge.

### 4.4 Retrieval

1. **Scope.** Filter by country scope and currency of the knowledge before any
   similarity work.
2. **Recall.** The claim and its variants each run vector search and Postgres
   full-text search over the scoped rows.
3. **Fuse.** Reciprocal rank fusion merges the lists. A fragment ranked well by
   any signal rises.
4. **Shortlist.** A scored rerank drops weak candidates.
5. **Judge.** The entailment step of 3.5 decides the verdict and returns the
   evidence span.

## 5. Leg three: live lookup on consent

### 5.1 Why it exists

Ingestion runs on a schedule. A rumour does not. Someone may ask about something
published an hour ago, before the next poll. Rather than answer badly, Ma'at
breaks its own protocol, with permission.

### 5.2 How it works

1. Confidence lands below the gate.
2. Ma'at says so plainly, and says why: nothing found, or found but it settles
   nothing.
3. It asks the visitor for permission to look at its trusted sources for this
   question.
4. On yes, it searches **only the configured sources**. Never the open web.
5. It reports back honestly what it found or did not find, and gives the
   resulting verdict.
6. On no, the answer is Insufficient evidence with the honest explanation.

Consent is per question, not per session.

Content fetched live is used to answer and is not written into memory by that
act alone. What enters the corpus enters through the scheduled pipeline, so the
corpus stays something we configured rather than something visitors built.

## 6. The public record

### 6.1 Answer now, publish later

Every visitor gets their answer immediately. Publication is a separate decision.

Rumours are stored and clustered by meaning, using the embedding of the neutral
paraphrase rather than string matching, so the same rumour in different words
lands in one record.

**A rumour becomes a public article on its third mention.** Below that it stays
in the table with its mention count. Staff can publish earlier or hold one back.
At the threshold it publishes automatically, because with no agent in the loop
that is the only way it happens at all.

No duplicates. One rumour, one record, one article.

### 6.2 What an article says

What the rumour is, what the record says, the verdict, and the sources with
their highlighted evidence. Where the evidence is thin the article says so
plainly and gives the little that is known. Being upfront is the product.

## 7. Data model sketch

Names are indicative, not final.

**Source.** Publishing body, door, address, scope (global or country), cadence,
active flag.

**Document.** Belongs to a source. Filename or URL, fetched date, published date,
content fingerprint, version, current flag, archived original bytes.

**Chunk.** Belongs to a document. Kind (fragment or card), text, retrieval text,
embedding, full-text vector, position metadata (page, heading path), parser
version, embedding model.

**Rumour.** Neutral paraphrase, embedding, the five W fields, first seen, mention
count, cluster key, verdict, confidence, published flag.

**Mention.** One visitor asking. Belongs to a rumour. Timestamp, the claim record,
the verdict given at the time.

**Evidence.** Links a rumour to a chunk. Judgement (supports, contradicts,
settles nothing, unrelated), score, the highlighted sentence span.

**Conversation.** The interview, its turns, and the interpreter output per turn.

## 8. Bootstrap and reference data

The application needs its permanent structure seeded before it can run, kept
separate from any demo data, and safe to run again on a live install.

- **Currencies.** ISO 4217 catalogue. Reference data now; there is no paid tier
  yet.
- **Countries.** Seeded automatically, linked to currency, and used for the
  country scope on sources and on claims.
- **Timezones.** Seeded with currencies, before countries, for the same linkage.
- **Staff groups and capabilities.** Who may configure sources, upload documents
  and publish or withhold an article.
- **Seed corpus.** Real documents from reliable bodies, ingested through the real
  pipeline, so the system can be exercised honestly before it goes live.
- **Seed rumours.** A set of known claims, some supported by the corpus and some
  not, so all three verdicts can be produced and tested.

The existing mock content in the widget and the dashboard is not ingested. Our
own material stays at the front of the site, but it will be real material.

## 9. Infrastructure to add

None of this exists in the Ma'at backend today.

- **pgvector** extension on PostgreSQL, for embeddings.
- **Celery** workers and **beat**, for scheduled polling and background ingestion.
- **Redis**, as the broker and as the shared cache backing rate limits and
  throttle counters.
- **Model provider keys of Ma'at's own**, separate from any other project, so its
  spend is visible on its own.

## 10. Security, abuse and privacy

- The quarantined interpreter is the boundary. Untrusted text never reaches a
  prompt that carries Ma'at's instructions.
- The widget is public and unauthenticated, and every question costs money.
  Per-address rate limits and a daily spend cap, with an honest "try again
  shortly" rather than a blank failure.
- Raw visitor text is kept only briefly, for abuse handling. The neutral
  paraphrase is the working record.
- Staff only for configuring sources, uploading documents and publishing.
- The dashboard is already behind the session guard.

## 11. Build order

Each step usable before the next begins.

1. Infrastructure: pgvector, Celery, beat, Redis, bootstrap and reference data.
   *Done for the base model, the catalogues, the profile and the bootstrap
   command. pgvector, Celery, beat and Redis arrive with step two, which is when
   there is something to embed and something to schedule.*
2. Ingestion and retrieval, with real documents uploaded by staff.
3. The conversation: quarantined read, the interview, judgement, verdict with
   public highlighted citations. The widget stops being mocked.
4. The rumour table, clustering, mention counts and automatic publication.
5. Scheduled pulling from feeds and APIs.
6. Consented live lookup of configured sources.
7. Dashboard and landing page move from sample data to real data.

## 12. The AI package

`backend/ai/` is the model-calling half of sections 3 to 5, one file per stage:

| File | Stage |
| --- | --- |
| `provider.py` | The one place that knows the client, the key and the model per role. |
| `prompts.py` | The voice, and every prompt, in one file. |
| `interpreter.py` | The quarantined read of visitor text (3.1). |
| `interview.py` | The five Ws, the follow-up budget, "just tell me" (3.2, 3.3). |
| `conversation.py` | Greetings, pleasantries, reading the claim back, the consent ask. |
| `embeddings.py` | Vectors for storage (strict) and search (may degrade). |
| `enrichment.py` | Situating contexts and document cards, at ingestion (4.3). |
| `rerank.py` | The recall gate, the first of the two numbers (3.5). |
| `judge.py` | The judgement and the verdict, the second number and the gate (3.5). |
| `answer.py` | The honest reply, with citations and the never-false rule (3.4, 3.6). |

Nothing in the package touches the database. Every stage has a deterministic
offline path, and the provider is one setting away from being swapped.

## 13. Deferred

- Translation of the answer path. English only for now.
- Any paid tier. Currency is reference data until then.
- Newspapers as sources. Institutional sources only.
