"""Leg three: asking the configured APIs, on demand, with the visitor's consent.

The feeds are polled on a schedule and the model never touches them. This is
the other kind of source: a statistical warehouse that holds numbers rather
than announcements, and answers a question rather than publishing a stream.
There is nothing to poll. There is a question to ask, at the moment a claim
needs a figure the corpus does not hold.

What comes back is stored as a document like any other, attributed to the body
that answered, dated the day we asked, filed under the country it is about.
So the second person asking the same thing is answered from the shelf, the
figure is quotable with a citation, and it counts toward publication exactly
as a feed item does. Check the store first; call out only when it is short.

Every API answers differently, so each has a small adapter. An adapter takes a
claim and a country and returns short plain-prose facts, one per finding, in
the body's own terms. It never invents a figure: if the endpoint has no data
for that country it returns nothing and says nothing.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date

import requests
from django.utils import timezone

from appsettings.models import CountryCoverage
from core.models import Country
from knowledge.models import Document, Source
from knowledge.parsing import DocumentUnreadable
from knowledge.services import ingest_document

log = logging.getLogger(__name__)

USER_AGENT = "MaatBot/1.0 (+https://maatverify.com; rumour verification)"
TIMEOUT = 15

#: How long a fetched fact stands before the same question goes back to the
#: endpoint. Statistical series move yearly or monthly; a day is generous.
FACT_TTL_HOURS = 24


@dataclass
class Fact:
    """One thing an endpoint told us, written as a sentence somebody can quote."""

    title: str
    text: str
    url: str
    published: date | None = None


# --------------------------------------------------------------------------
# Adapters. Each returns facts or [], and never raises past its own boundary.
# --------------------------------------------------------------------------

#: What a claim is about, mapped to the World Bank series that speak to it.
#: Deliberately short. An adapter that guesses indicator codes is an adapter
#: that returns confident nonsense.
WORLD_BANK_SERIES = {
    "inflation": ("FP.CPI.TOTL.ZG", "Inflation, consumer prices (annual %)"),
    "price": ("FP.CPI.TOTL.ZG", "Inflation, consumer prices (annual %)"),
    "cost of living": ("FP.CPI.TOTL.ZG", "Inflation, consumer prices (annual %)"),
    "gdp": ("NY.GDP.MKTP.CD", "GDP (current US$)"),
    "economy": ("NY.GDP.MKTP.CD", "GDP (current US$)"),
    "growth": ("NY.GDP.MKTP.KD.ZG", "GDP growth (annual %)"),
    "population": ("SP.POP.TOTL", "Population, total"),
    "unemployment": ("SL.UEM.TOTL.ZS", "Unemployment, total (% of labour force)"),
    "jobs": ("SL.UEM.TOTL.ZS", "Unemployment, total (% of labour force)"),
    "poverty": ("SI.POV.DDAY", "Poverty headcount ratio at $2.15 a day (% of population)"),
    "debt": ("GC.DOD.TOTL.GD.ZS", "Central government debt, total (% of GDP)"),
    "life expectancy": ("SP.DYN.LE00.IN", "Life expectancy at birth, total (years)"),
    "mortality": ("SP.DYN.IMRT.IN", "Mortality rate, infant (per 1,000 live births)"),
    "electricity": ("EG.ELC.ACCS.ZS", "Access to electricity (% of population)"),
    "internet": ("IT.NET.USER.ZS", "Individuals using the Internet (% of population)"),
    "literacy": ("SE.ADT.LITR.ZS", "Literacy rate, adult total (% of people ages 15 and above)"),
}

#: WHO Global Health Observatory indicator codes for the same purpose.
GHO_SERIES = {
    "life expectancy": ("WHOSIS_000001", "Life expectancy at birth (years)"),
    "maternal": ("MDG_0000000026", "Maternal mortality ratio (per 100 000 live births)"),
    "malaria": ("MALARIA_EST_INCIDENCE", "Estimated malaria incidence (per 1000 population at risk)"),
    "tuberculosis": ("MDG_0000000020", "Incidence of tuberculosis (per 100 000 population per year)"),
    "hiv": ("HIV_0000000001", "Estimated number of people living with HIV"),
    "immunisation": ("WHS4_100", "Measles-containing vaccine first dose (MCV1) immunization coverage (%)"),
    "vaccination": ("WHS4_100", "Measles-containing vaccine first dose (MCV1) immunization coverage (%)"),
    "measles": ("WHS4_100", "Measles-containing vaccine first dose (MCV1) immunization coverage (%)"),
    "under-five": ("MDG_0000000007", "Under-five mortality rate (per 1000 live births)"),
    "child mortality": ("MDG_0000000007", "Under-five mortality rate (per 1000 live births)"),
}


def _matches(claim: str, table: dict) -> list[tuple[str, str]]:
    lowered = claim.lower()
    seen: set[str] = set()
    out = []
    for keyword, (code, label) in table.items():
        if keyword in lowered and code not in seen:
            seen.add(code)
            out.append((code, label))
    return out[:2]


def _get_json(url: str):
    response = requests.get(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"}, timeout=TIMEOUT)
    response.raise_for_status()
    return response.json()


def world_bank(claim: str, country: Country, base: str) -> list[Fact]:
    facts = []
    for code, label in _matches(claim, WORLD_BANK_SERIES):
        try:
            url = f"{base.rstrip('/')}/country/{country.iso3}/indicator/{code}?format=json&per_page=5&mrnev=3"
            data = _get_json(url)
            rows = data[1] if isinstance(data, list) and len(data) > 1 and data[1] else []
            rows = [r for r in rows if r.get("value") is not None]
            if not rows:
                continue
            lines = [f"{label} for {country.name}, according to the World Bank:"]
            for row in rows[:3]:
                lines.append(f"In {row['date']}, {label.split(' (')[0].lower()} was {_number(row['value'])}.")
            facts.append(
                Fact(
                    title=f"{label}: {country.name}",
                    text="\n".join(lines),
                    url=f"https://data.worldbank.org/indicator/{code}?locations={country.iso2}",
                    published=date(int(rows[0]["date"]), 1, 1) if str(rows[0]["date"]).isdigit() else None,
                )
            )
        except Exception as exc:  # noqa: BLE001 - one series failing must not lose the rest
            log.warning("world bank %s for %s: %s", code, country.iso3, exc)
    return facts


def who_gho(claim: str, country: Country, base: str) -> list[Fact]:
    facts = []
    for code, label in _matches(claim, GHO_SERIES):
        try:
            url = f"{base.rstrip('/')}/{code}?$filter=SpatialDim%20eq%20'{country.iso3}'"
            data = _get_json(url)
            rows = [r for r in data.get("value", []) if r.get("NumericValue") is not None]
            # Both sexes where the series is split, newest first.
            both = [r for r in rows if r.get("Dim1") in (None, "", "BTSX", "SEX_BTSX")] or rows
            both.sort(key=lambda r: str(r.get("TimeDim", "")), reverse=True)
            if not both:
                continue
            lines = [f"{label} for {country.name}, according to the World Health Organization:"]
            for row in both[:3]:
                lines.append(f"In {row['TimeDim']}, the figure was {_number(row['NumericValue'])}.")
            facts.append(
                Fact(
                    title=f"{label}: {country.name}",
                    text="\n".join(lines),
                    url=f"https://www.who.int/data/gho/data/indicators/indicator-details/GHO/{code}",
                    published=date(int(both[0]["TimeDim"]), 1, 1) if str(both[0].get("TimeDim", "")).isdigit() else None,
                )
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("gho %s for %s: %s", code, country.iso3, exc)
    return facts


def unhcr(claim: str, country: Country, base: str) -> list[Fact]:
    if not re.search(r"refugee|displace|asylum|idp|camp", claim, re.IGNORECASE):
        return []
    try:
        url = f"{base.rstrip('/')}/population/?coa={country.iso3}&year={timezone.now().year - 1}"
        data = _get_json(url)
        items = data.get("items", []) or []
        total = sum(int(i.get("refugees", 0) or 0) for i in items)
        idps = sum(int(i.get("idps", 0) or 0) for i in items)
        asylum = sum(int(i.get("asylum_seekers", 0) or 0) for i in items)
        if not (total or idps or asylum):
            return []
        year = timezone.now().year - 1
        text = (
            f"People of concern hosted in {country.name} in {year}, according to UNHCR:\n"
            f"Refugees: {total:,}. Internally displaced people: {idps:,}. Asylum seekers: {asylum:,}."
        )
        return [Fact(title=f"Refugees and displaced people hosted in {country.name}", text=text,
                     url=f"https://www.unhcr.org/refugee-statistics/download/?url=coa&coa={country.iso3}",
                     published=date(year, 12, 31))]
    except Exception as exc:  # noqa: BLE001
        log.warning("unhcr for %s: %s", country.iso3, exc)
        return []


def _number(value) -> str:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return str(value)
    if abs(v) >= 1_000_000:
        return f"{v:,.0f}"
    if abs(v) >= 100:
        return f"{v:,.1f}"
    return f"{v:.2f}".rstrip("0").rstrip(".")


#: Which adapter answers for which source, by the host in its address. Held
#: by name and resolved at call time, so a test can stand in for one adapter
#: without the table quietly keeping the real function.
ADAPTERS = {
    "api.worldbank.org": "world_bank",
    "ghoapi.azureedge.net": "who_gho",
    "api.unhcr.org": "unhcr",
}


def _adapter_for(source: Source):
    for host, name in ADAPTERS.items():
        if host in source.address:
            return globals()[name]
    return None


# --------------------------------------------------------------------------
# The lookup itself
# --------------------------------------------------------------------------


def held_recently(claim: str, country: Country | None) -> bool:
    """Whether a lookup for this claim and country was stored within the TTL.

    The store is checked first, always. Calling out for a figure fetched an
    hour ago would spend the publisher's goodwill for nothing.
    """
    since = timezone.now() - timezone.timedelta(hours=FACT_TTL_HOURS)
    return Document.active.filter(
        source__door=Source.Door.API,
        country=country,
        fetched_at__gte=since,
        title__icontains=_topic(claim),
    ).exists()


def _topic(claim: str) -> str:
    words = [w for w in re.findall(r"[a-z]{4,}", claim.lower()) if w not in {"that", "this", "with", "from", "have", "will", "been", "there", "their", "about", "heard"}]
    return words[0] if words else claim[:20]


def lookup(claim: str, country: Country | None) -> list[Document]:
    """Ask every API source for this country about the claim; store what comes back.

    Country sources are asked first and preferred. Global API sources are asked
    with the same country code, since every one of them takes one. Returns the
    documents written, which the caller then weighs like any other passages.

    A country switched off in Settings is not asked about. Nothing is spent on
    a country until somebody throws its switch.
    """
    if country is None or not CountryCoverage.active.filter(country=country, is_active=True).exists():
        return []
    sources = list(
        Source.active.filter(door=Source.Door.API, is_active=True)
        .filter(country=country)
        .select_related("country")
    ) or list(Source.active.filter(door=Source.Door.API, is_active=True, country__isnull=True))

    written: list[Document] = []
    seen_hosts: set[str] = set()
    for source in sources:
        adapter = _adapter_for(source)
        host = next((h for h in ADAPTERS if h in source.address), "")
        if adapter is None or host in seen_hosts:
            continue
        seen_hosts.add(host)
        for fact in adapter(claim, country, source.address.split("/country/")[0].split("?")[0]):
            try:
                document = ingest_document(
                    source=source,
                    filename=_filename(fact.title),
                    data=fact.text.encode("utf-8"),
                    country=country,
                    published_at=fact.published,
                    content_type="text/plain",
                )
                Document.objects.filter(pk=document.pk).update(title=fact.title, url=fact.url)
                # Hand back what is now stored, not the pre-update object.
                document.refresh_from_db(fields=["title", "url"])
                written.append(document)
            except DocumentUnreadable:
                continue
            except Exception as exc:  # noqa: BLE001
                log.warning("storing fact from %s: %s", source.name, exc)
    return written


def _filename(title: str) -> str:
    stem = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80] or "fact"
    return f"{stem}.txt"
