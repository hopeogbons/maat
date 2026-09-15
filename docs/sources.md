# Ma'at sources: the four doors

How a body's publications reach Ma'at, who qualifies, and the rules each door
is used under. Decided by Hope on 2026-09-15, replacing the earlier position
that Ma'at reads only feeds and APIs. Written down so the decision, and its
limits, survive between sessions and can be shown to a reviewer.

## 1. The principle

Ma'at repeats only what a reliable institution has published, and cites it.
A source is therefore chosen for who it is, not for how easy it is to read.
The way its publications are read is then the most reliable way that body
offers, and nothing is read in a way the body has asked us not to.

## 2. The doors, in order of preference

| Order | Door | What it is | When it is used |
|---|---|---|---|
| 1 | **Public API** | A structured endpoint the body exposes. Includes the WordPress REST API that most public bodies' sites carry, which returns complete articles with dates and links. | Whenever the site has one. Complete text, exact dates, no guessing. |
| 2 | **Feed** | An RSS or Atom feed the body maintains. | When there is no API. Preferred when the feed carries full text; a summary-only feed still counts, as the body's own words. |
| 3 | **Public web pages** | The body's own news or press-release pages, read one article at a time. | Only for an official or public-interest body that offers neither API nor feed. |
| 4 | **Direct upload** | Files staff add by hand. | Bodies that publish documents rather than a stream, and Ma'at's own publications. |

A source's door is decided by asking the site what it offers, in that order
(section 5), not by assumption. If a body later adds a feed or API, it moves
up a door.

## 3. Who qualifies for the pages door

The pages door exists because the bodies a country relies on most often
publish no feed and no API: the national emergency agency, the disease-control
centre, the ministries, the regulators, the public broadcaster, the state news
agency. Their word is exactly what a rumour must be checked against.

Eligible:

- Government ministries, departments and agencies.
- Statutory regulators and commissions.
- Public broadcasters and the state news agency.
- State-owned bodies whose statements the public depends on, such as the
  national oil company on fuel prices or the power utility on outages.
- Recognised humanitarian bodies in the same role, such as the national Red
  Cross society.

Not eligible, at any door but upload with permission:

- Private newspapers, television, radio, blogs or aggregators. Their business
  is the page; reading it programmatically takes what they sell.
- Anything behind a login, a paywall, or a consent wall.

Who qualifies is a register decision made by staff, not something the reader
infers. The reader will read any site it is pointed at; the register is where
the line is held.

## 4. How the pages door behaves

Every one of these is enforced in `backend/knowledge/pages.py`, not left to
good intentions.

1. **robots.txt first.** Fetched before anything else on the site and obeyed
   to the letter, including `Crawl-delay`. A robots file that cannot be read
   because the server errored closes the door for that poll. A missing robots
   file is taken, by convention, to mean public pages are fine.
2. **Identified.** Every request carries a User-Agent naming Ma'at and its
   purpose, so a body that would rather we did not can say so.
3. **Slowly.** One request at a time, at least two seconds apart per site, or
   longer if robots asks. At most 20 new articles per poll, so a backlog is
   read over days.
4. **Whole articles, once.** The article is separated from the navigation,
   sidebar and footer. A page that does not read as a complete article (a
   menu, a gallery, a stub) is not kept. A page already held is never fetched
   again. PDFs linked from a news page are read as documents.
5. **Attributed.** Each article is stored with the body's name, its title, its
   date as the page states it, and its address, and is cited that way.
6. **Filed.** A national body's articles are filed under its country. Nothing
   is filed under a country that is not on the Settings list, and nothing is
   polled, searched, asked or shown for a country switched off.

What the door does not do: follow links off the site, read comments, fetch
images or media, submit forms, hold cookies, or read anything a page asks a
visitor to sign in for.

## 5. How a source is proven before it is added

`manage.py discover_source <address>` asks the site, in order: is there a
WordPress REST API; is there a feed announced on the page or at the usual
paths; are there sitemaps; does the news page yield a link that reads as a
complete article. Each answer is verified by actually reading it. The command
recommends a door and prints the configuration to store. Nothing enters the
register that the command did not read successfully, and after seeding, the
first poll must bring documents in before the source is considered proven.

## 6. Country filing and the coverage switch

Settings holds the country list and the switch for each. A country switched
off costs nothing: its sources are not polled, its documents are not searched
or shown, and no API is asked about it. Switching it on starts all of that at
once. Adding a country switched off is how it is prepared: its sources can be
registered and tested before Ma'at answers for it.

## 7. The register

The bodies connected, by country and door, as proven on 2026-09-15: every
row below was read live and brought documents in. Bodies probed and not added
are listed with the reason, so the same ground is not walked twice.

### Nigeria (switched on)

| Body | Door | What it gives |
|---|---|---|
| National Emergency Management Agency (NEMA) | API (WordPress REST) | Disaster alerts, flood warnings, relief operations |
| Federal Ministry of Health and Social Welfare | API (WordPress REST) | Ministerial statements, outbreak responses |
| National Agency for Food and Drug Administration and Control (NAFDAC) | API (WordPress REST) | Product recalls, fake-medicine alerts |
| National Primary Health Care Development Agency (NPHCDA) | API (WordPress REST) | Immunisation campaigns, vaccine notices |
| National Health Insurance Authority (NHIA) | API (WordPress REST) | Health insurance notices |
| Nigeria Security and Civil Defence Corps (NSCDC) | API (WordPress REST) | Security advisories |
| Federal Ministry of Information and National Orientation | API (WordPress REST) | Official statements and clarifications |
| State House, Nigeria | API (WordPress REST) | Statements from the Presidency |
| News Agency of Nigeria (NAN) | API (WordPress REST) | The state news agency's reports |
| Nigeria Immigration Service | API (WordPress REST) | Passport, visa and border notices |
| Federal Ministry of Finance | API (WordPress REST) | Fiscal statements and clarifications |
| National Pension Commission (PenCom) | API (WordPress REST) | Pension notices |
| Federal Ministry of Agriculture and Food Security | API (WordPress REST) | Food security and farm inputs |
| Nigerian Electricity Regulatory Commission (NERC) | API (WordPress REST) | Tariff orders, electricity notices |
| Federal Radio Corporation of Nigeria (Radio Nigeria) | Feed (full text) | News from the public broadcaster |
| West African Examinations Council, Nigeria (WAEC) | Feed (full text) | Exam timetables and results notices |
| Nigerian Communications Commission (NCC) | Feed (full text) | SIM registration, NIN linkage |
| Securities and Exchange Commission Nigeria | Feed (summaries) | Investor alerts, unregistered-scheme warnings |
| Nigerian Television Authority (NTA) | Pages: `nta.ng/news`, stories under a category | News from the public broadcaster |
| Nigerian Civil Aviation Authority (NCAA) | Pages: `ncaa.gov.ng/media/press-releases/` | Aviation directives and press releases |

Also for Nigeria, from the global platforms: HDX (API, by country), and the
World Bank, WHO GHO and UNHCR asked on demand.

### Kenya (on the list, switched off until Hope switches it on)

| Body | Door | What it gives |
|---|---|---|
| Kenya Broadcasting Corporation (KBC) | API (WordPress REST) | News from the public broadcaster |
| National Drought Management Authority (NDMA) | API (WordPress REST) | Drought early-warning bulletins |
| Central Bank of Kenya | API (WordPress REST) | Monetary policy, currency notices |
| The Presidency, Kenya | API (WordPress REST) | Statements from State House |
| Kenya Red Cross Society | API (WordPress REST) | Emergency response and appeals |
| Social Health Authority (SHA) | API (WordPress REST) | Registration, contributions, benefits |
| Kenya Bureau of Standards (KEBS) | API (WordPress REST) | Standards, recalls, counterfeit alerts |
| Ministry of Agriculture and Livestock Development | API (WordPress REST) | Food security, subsidies |
| Kenya Airports Authority | API (WordPress REST) | Airport operations, travel advisories |
| Kenya Medical Research Institute (KEMRI) | API (WordPress REST) | Research findings, health statements |
| Ministry of Education | Feed (summaries) | School calendars, examinations |
| Communications Authority of Kenya | Feed (full text) | SIM, network and broadcasting notices |
| Directorate of Criminal Investigations (DCI) | Feed (summaries) | Investigations, arrests, public warnings |
| The National Treasury | Feed (summaries) | Budget, public debt, fiscal notices |
| Kenya Meteorological Department | Pages: `meteo.go.ke/news/` | Weather warnings, seasonal outlooks |
| Kenya Revenue Authority (KRA) | Pages: `kra.go.ke/news-center/press-release` | Tax notices and clarifications |

### Probed and not added

| Body | Why not |
|---|---|
| Nigeria Centre for Disease Control (NCDC) | News is rendered in the browser by script; the pages carry no article text to read. Revisit if the site changes or a feed appears. |
| Central Bank of Nigeria | No API or feed; press releases are not reachable as pages. |
| Independent National Electoral Commission (INEC) | Press pages carry 150 characters of text; the release itself is an embedded image or file. |
| National Bureau of Statistics | Brochure site; no news listing found. |
| Federal Road Safety Corps | No API, feed or readable news pages. |
| Joint Admissions and Matriculation Board (JAMB) | News section is a shell page; items are loaded by script. |
| NECO, NYSC, NIMC, Nigeria Customs, NMDPRA, NIHSA, NDLEA, NSIB, NNPC | No API or feed, and no news listing that yields readable articles. |
| Nigerian Meteorological Agency (NiMet), Pharmacy and Poisons Board (Kenya) | The site answers every request with a redirect that needs a browser to resolve (a bot challenge). We do not pretend to be a browser. |
| Nigeria Police Force | Rate-limits every request (HTTP 429). |
| FIRS, Federal Ministry of Education (Nigeria), FCCPC, Kenya National Highways Authority | Down or timing out at the time of probing. |
| Ministry of Health (Kenya), KNBS, Kenya News Agency, IEBC, National Police Service, KNEC, Interior, Foreign Affairs, EPRA, NTSA, KWS, NCIC | Their https certificates do not validate. Ma'at does not read over a connection it cannot verify. Revisit when they fix it. |
| Kenya Power, MyGov | Newsroom rendered by script; no readable pages. |
| Our World in Data, UNICEF Data Warehouse | Registered from the earlier spec with base addresses that return HTML or XML, and no adapter yet. Left on the register switched off until an adapter exists. |

### Housekeeping worth knowing

- The World Bank, WHO GHO and UNHCR rows are marked `lookup` in their schema:
  they are asked on demand and never polled. The register shows them as
  "Asked on demand".
- Documents from an off country are filed and counted but not shown, searched
  or cited until the country is switched on.
- Two pollers on one source at once (a forced poll beside the scheduler) once
  produced duplicate versions; the writer now retries once when another writer
  took the version. Run forced polls with the scheduler stopped all the same.
