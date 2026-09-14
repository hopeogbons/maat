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
from core.models import Country

#: Words beyond the country's own name that mean it. Extend as countries are
#: covered; a country with no entry is still matched by its name.
ALIASES: dict[str, tuple[str, ...]] = {
    "NG": ("Nigerian", "Nigerians", "Abuja", "Lagos", "Kano", "Port Harcourt", "Kaduna", "Ibadan", "Borno", "Maiduguri"),
    "KE": ("Kenyan", "Kenyans", "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Turkana", "Dadaab", "Kakuma"),
}


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
