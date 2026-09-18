# Plan: the Ma'at handbook (PDF)

What you asked for, as I understand it, before a single page is produced.
Correct anything here; the PDF follows this plan exactly.

## 1. What the document is

A complete, designed handbook of Ma'at as it runs today on your machine:
what Ma'at is, how a conversation unfolds from a greeting to a verdict, how
knowledge gets in through the four doors, how the platform behaves towards
the sites it reads, and every page of the staff dashboard. Nothing the
application does is left out. It is proof of concept material: every claim in
it is demonstrated by a screenshot of the running system or a quoted excerpt
from a real ingested document.

- **Format:** PDF, A4 portrait, designed in the Ma'at palette (deep teal,
  warm gold, sand and cream), typographic apostrophe in "Ma'at" throughout.
- **Written for:** a reader who has not used Ma'at: a reviewer, a partner, or
  you in six months. Plain language first, technical detail second, code kept
  to an appendix.
- **Source file:** `docs/handbook.html`, rendered to `docs/maat-handbook.pdf`
  with headless Chromium. Screenshots taken from the live local app with the
  same browser, stored under `docs/handbook/`.

## 2. Page order

1. **Cover** in the Ma'at page design: teal ground, the feather mark, the
   wordmark, the tagline "Heard something? Check it before you share it.",
   the drifting faded icons of the landing page, the date and version.
2. **Contents** with section titles and page numbers.
3. **The sections below**, each opening on a new page with a short lead, then
   body, then the screenshot or excerpt that demonstrates it.
4. **Appendices** and a closing page.

Running header on every page (section name), running footer (Ma'at, page
number). Verdict colours as the product uses them: muted green verified, amber
unverified, grey insufficient. No red anywhere.

## 3. Sections and what each one covers

### 3.1 What Ma'at is
The problem: rumours travel faster than corrections. The promise: bring what
you heard, Ma'at weighs it against what reliable institutions have actually
published, answers with a verdict and the document behind it, or says
honestly that it cannot. "When there is no source, Ma'at says so." Who it is
for, the two countries live today, the languages offered.

### 3.2 The conversation, step by step
The heart of the document. The widget as a visitor sees it, with a screenshot
at each step:

1. **Opening.** The launcher, the welcome, choosing a language, text or a
   voice note.
2. **Pleasantries.** A greeting is answered as a greeting; small talk never
   triggers a verdict. What happens if someone tries to manipulate the
   assistant ("ignore your instructions"): it is set aside, politely.
3. **Hearing the rumour.** Ma'at reads back what it understood, then asks at
   most two short questions to pin down who, what, when and where. "Just
   tell me what you have" skips the questions. Why the country matters.
4. **Weighing.** What happens behind the reply: retrieval from the record,
   the reranker, the judge's four answers (supports, contradicts, same
   subject but settles nothing, unrelated), the confidence gate, and why the
   gate sits on the judgement and never on similarity.
5. **The short path: a rumour the record does not support.** Shown briefly.
   The honest reply, the offer to look further in trusted online sources,
   what "yes" does (the on-demand APIs), and how the closest records are
   still shown with a link so the visitor can judge for themselves.
6. **The full path: a rumour that is true.** Shown in full. The verdict card:
   the verdict, the confidence, the cited source with the exact sentence the
   judgement rests on highlighted, the publishing body and date, the "Open
   original" link to the publisher's own page, and, where the document is
   marked shareable, the file offered for download. The excerpt is quoted in
   the document so the reader can see the genuine source text.
7. **After the verdict.** Copies of shareable documents on consent, how the
   same rumour raised again is recognised, and the 30-day question ("is this
   something new?").
8. **Memory and privacy.** One conversation per widget session, a fresh
   greeting after thirty minutes of silence, the visitor cookie, raw-text
   retention.

### 3.3 From private answers to public articles
A rumour is answered privately until enough different people have raised it.
The reporter count (different browsers, not repeated messages), the
publication threshold from Settings, the article page with tags, and how a
duplicate rumour is referred to the existing article.

### 3.4 The record: unified ingestion and the four doors
Architecture, with a diagram:

- **One pipeline for everything:** parse (PDF, DOCX, ODT, RTF, TXT, page
  text), clean, split into passages with headings kept, contextual
  enrichment, embeddings, versioned storage (re-uploads never overwrite),
  filed under a country or global.
- **The four doors, in order of preference:** public API (including the
  WordPress REST API most public bodies carry), feed (RSS/Atom with
  conditional requests), public web pages (for official bodies with neither),
  direct upload by staff.
- **On-demand APIs:** World Bank, WHO GHO, UNHCR asked only when a claim
  needs a figure, cached as documents for a day.
- **The scheduler:** the poller daemon, cadence per source, back-off after
  failures, one reader per door, failures recorded per source without
  stopping the batch.
- **The country switch:** a country switched off in Settings is not polled,
  not searched, not asked and not shown; switching it on starts all four at
  once.
- **Discovery:** `discover_source` asks a site what it offers and proves it
  before anything is added.
- **The register as it stands:** every source by country and door, each one
  read live, with its logo.

### 3.5 Integrity: how Ma'at behaves towards the sites it reads
A section of its own, as you asked:

- Official and public-interest bodies only; never private outlets.
- robots.txt fetched first and obeyed to the letter, crawl-delay included; an
  unreadable robots file closes the door.
- Every request announces itself as Ma'at with a contact address.
- One request at a time, paced; small batches; nothing already held is fetched
  twice.
- No login, no paywall, no cookies, no forms, no images or media.
- No impersonating a human browser to pass a bot challenge; no reading over a
  connection whose certificate does not validate; no pretending.
- The headless browser is used only where a site draws its pages with
  JavaScript, under the same rules.
- What this costs, stated honestly: the sites left out and why (the table from
  `docs/sources.md`).

### 3.6 The staff dashboard, page by page
Each with a screenshot:

- **Sign-in** as a dialog over the site; staff only.
- **Dashboard:** real figures (weighed, cited, documents in), the digest,
  activity by day, top sources with their marks, channels.
- **Rumours** and **Conversations** as they stand today.
- **Sources:** cards and list, the country lens, the door filter, health,
  "asked on demand", the add and edit form with its three steps.
- **Documents:** upload folder, shelves by country (closed by default,
  remembered), search, publisher marks, shared/private toggle, twenty a shelf.
- **Settings:** the country list and switch, verdict thresholds, rate limits
  and retention.
- **Profile** and sign-out.

### 3.7 Limits and what is next
The honest list: sites that publish nothing readable, sites that block
automated readers, sites with broken certificates, countries not yet switched
on, features not yet built (Conversations page, source form persistence,
median response time).

### Appendices
A. Glossary (verdict, claim, rumour, mention, reporter, door, chunk).
B. The register in full, as a table.
C. Operations: dev_up/dev_down, the poller, discover_source, seed_sources,
   fetch_logos; environment variables.
D. Where things live in the code, one line each.

## 4. Screenshots to take

From the running local app, at 1440×1000 for dashboard pages and at the
widget's own width for chat states:

- Landing page with the launcher; widget welcome; language screen.
- Greeting exchange; manipulation set aside.
- Read-back and follow-up question; "just tell me" path.
- Consent ask; insufficient-evidence reply with closest records shown.
- Verified verdict card with highlighted excerpt and "Open original"; the
  shared-file download row.
- Dashboard front page; Sources cards; Sources list; source form; Documents
  with shelves and marks; Settings; sign-in dialog.

The verified example uses a real rumour that the corpus genuinely settles,
chosen from documents already ingested (for instance a NAFDAC recall, a NEMA
flood advisory, or the NIMC Act signing); the quoted excerpt is the exact
passage the judge relied on.

## 5. How I will produce it

1. Write the HTML with the Ma'at styles and paged layout (running headers,
   footers, page numbers, contents with page references).
2. Take every screenshot from the live app with Chromium.
3. Render to PDF with Chromium.
4. **Review loop.** Read the PDF page by page; check every statement against
   the running code and the live system; check layout (no orphaned headings,
   no cut screenshots, no overflow, consistent palette); fix; render again.
   Repeat until a full pass finds nothing to change, and only then stop. My
   target is that you could hand it to a reviewer without a correction.
5. Hand you the PDF path and the confidence I reached, with anything I could
   not verify named explicitly.

## 6. Not in scope unless you say so

- No invented figures: numbers come from the database on the day of
  rendering and are dated.
- No server or deployment material beyond a short note; the demo is local.
- No changes to the application while documenting it, except a fix if the
  documentation exposes a fault, which I will report.

Give the thumbs up and I start.
