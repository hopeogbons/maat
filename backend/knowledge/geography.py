"""Which covered country a piece of text is about, if any.

A global feed carries stories from everywhere. A UN News item about Lagos is
about Nigeria, and a visitor asking about Nigeria should find it under Nigeria,
not lose it in a pile marked global. So each incoming item is read for the
countries it names before it is filed.

Only covered countries are looked for. Filing a story under a country Ma'at
does not answer for would put it somewhere nobody can reach it.

Matching is by name, demonym and the largest cities: the words a story uses
when it is about a place. Deliberately no fuzzy matching, and whole words only,
because "Niger" inside "Nigeria" and "Kenya" inside a surname are exactly the
false positives that would file things wrongly and quietly.
"""

from __future__ import annotations

import re

from appsettings.models import CountryCoverage
from core.models import Country, StateProvince

#: Words beyond the country's own name that mean it. Extend as countries are
#: covered; a country with no entry is still matched by its name.
ALIASES: dict[str, tuple[str, ...]] = {
    # "Niger State" and its capital are Nigeria's; "Niger" on its own is not,
    # because the republic next door is a country in its own right.
    "NG": ("Nigerian", "Nigerians", "Abuja", "Lagos", "Kano", "Port Harcourt", "Kaduna", "Ibadan", "Borno", "Maiduguri", "Niger State", "Minna"),
    "KE": ("Kenyan", "Kenyans", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Turkana", "Dadaab", "Kakuma"),
}


#: Words that make a claim international: a body whose remit crosses borders,
#: a region rather than a country, or the world at large. A claim about any of
#: these belongs to the global shelf as much as to any one country's.
INTERNATIONAL_MARKERS = (
    "WHO", "World Health Organization", "World Health Organisation", "UN", "United Nations", "UNICEF", "UNHCR",
    "WFP", "World Food Programme", "World Bank", "IMF", "International Monetary Fund", "ECOWAS", "African Union",
    "East African Community", "EAC", "European Union", "EU", "West Africa", "East Africa", "sub-Saharan",
    "across Africa", "in Africa", "African countries", "the continent", "the world", "across countries",
    "several countries",
)
_INTERNATIONAL = re.compile(r"\b(?:" + "|".join(re.escape(w) for w in INTERNATIONAL_MARKERS) + r")\b")


def is_international(text: str) -> bool:
    """Whether the text is about more than one country, or about the world.

    True when it names an international body or a region, or names two or
    more different countries, covered or not. Case matters for the short
    names: "WHO" and "UN" are bodies, "who" and "un" are words.
    """
    text = (text or "").strip()
    if not text:
        return False
    if _INTERNATIONAL.search(text) or re.search(r"\b(?:international|worldwide|global|globally)\b", text, re.IGNORECASE):
        return True
    named = 0
    for name in Country.active.order_by("name").values_list("name", flat=True):
        if re.search(r"\b" + re.escape(name) + r"\b", text, re.IGNORECASE):
            named += 1
            if named >= 2:
                return True
    return False


def _pattern(country: Country) -> re.Pattern:
    words = [country.name, *ALIASES.get(country.iso2, ())]
    return re.compile(r"\b(?:" + "|".join(re.escape(w) for w in words) + r")\b", re.IGNORECASE)


def covered_patterns() -> list[tuple[Country, re.Pattern]]:
    """One compiled pattern per covered country, active or not.

    A country switched off is still recognised: its stories are filed under it
    so they are already in place the day it is switched on, rather than sitting
    under global needing to be re-sorted.
    """
    rows = CountryCoverage.active.select_related("country")
    return [(row.country, _pattern(row.country)) for row in rows]


def country_of(text: str, patterns: list[tuple[Country, re.Pattern]] | None = None) -> Country | None:
    """The one covered country the text is about, or None for global.

    A story naming two covered countries is filed global rather than under
    whichever happened to be listed first. It is about both, a single country
    column cannot say so, and global is the one place both audiences look.
    """
    patterns = covered_patterns() if patterns is None else patterns
    hits = [country for country, pattern in patterns if pattern.search(text or "")]
    return hits[0] if len(hits) == 1 else None


def named_country(text: str) -> Country | None:
    """Any country the text names outright, covered or not, by name or code.

    This is how a claim about somewhere Ma'at does not cover is recognised as
    such, so it can be answered from the global shelf rather than by searching
    countries it is not about.
    """
    where = (text or "").strip()
    if not where:
        return None
    match = Country.active.filter(name__iexact=where).first()
    if match is None and len(where) == 2:
        match = Country.active.filter(iso2__iexact=where).first()
    return match


_STATE_SUFFIX = re.compile(r"\s+(?:state|province|region|county)$", re.IGNORECASE)


def state_country(text: str) -> Country | None:
    """The covered country whose state or province the text names.

    "Niger" is a Nigerian state as well as a republic next door. A covered
    country's own subdivisions are looked up before any name is taken to mean
    a country outside coverage, because the visitor is far more likely to be
    talking about a place Ma'at answers for than one it does not.
    """
    parts = [_STATE_SUFFIX.sub("", part.strip()) for part in (text or "").split(",")]
    parts = [part for part in parts if part]
    if not parts:
        return None
    covered = [country for country, _ in covered_patterns()]
    if not covered:
        return None
    for part in parts:
        row = StateProvince.objects.filter(country__in=covered, name__iexact=part).select_related("country").first()
        if row:
            return row.country
    return None


def outside_country_in(text: str) -> Country | None:
    """A country outside coverage named in the text, as a whole word, or None.

    Read only after no covered country was found, so a claim about Ghana is
    known to be about Ghana even when the interpreter left `where` empty. A
    name that is also a covered country's state, like Niger, is skipped: the
    state is the likelier meaning and the `where` reading has already had its
    chance to say otherwise.
    """
    text = (text or "").strip()
    if not text:
        return None
    covered = [country for country, _ in covered_patterns()]
    covered_ids = {country.id for country in covered}
    state_names = {name.lower() for name in StateProvince.objects.filter(country__in=covered).values_list("name", flat=True)}
    for country in Country.active.exclude(id__in=covered_ids).only("id", "name", "iso2").order_by("name"):
        if country.name.lower() in state_names:
            continue
        if re.search(r"\b" + re.escape(country.name) + r"\b", text, re.IGNORECASE):
            return country
    return None
