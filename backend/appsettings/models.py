"""The numbers that decide how Ma'at behaves, in one editable row.

A confidence gate hard-coded in a module is a redeploy every time it needs
tuning, and tuning is exactly what a threshold is for. One row, loaded through
`AppSetting.current()`, edited in the dashboard.
"""

from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class AppSetting(BaseModel):
    """One row. `current()` creates it on first use with the agreed defaults."""

    #: The gate sits on the JUDGEMENT that a passage supports or contradicts the
    #: claim, never on how similar the text looked. Similarity measures what a
    #: passage is about and cannot tell agreement from contradiction.
    confidence_gate = models.PositiveSmallIntegerField(
        default=85,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text=_("Below this, Ma'at says so and offers to look further."),
    )
    #: How many people must raise the same rumour before it gets a public page.
    mentions_before_publish = models.PositiveSmallIntegerField(
        default=3, validators=[MinValueValidator(1)]
    )
    #: The interview must not become an interrogation.
    max_followup_questions = models.PositiveSmallIntegerField(
        default=2, validators=[MaxValueValidator(5)]
    )
    #: Two ways a public, unauthenticated widget can cost money faster than it
    #: should. Both fail to an honest "try again shortly", never a blank error.
    questions_per_visitor_per_hour = models.PositiveSmallIntegerField(default=20)
    daily_question_cap = models.PositiveIntegerField(default=2000)
    #: How long the visitor's own words are kept before only the paraphrase
    #: remains.
    raw_text_retention_days = models.PositiveSmallIntegerField(default=30)
    #: Recorded so rows written by an older model are findable and repairable.
    embedding_model = models.CharField(max_length=120, blank=True)
    answer_model = models.CharField(max_length=120, blank=True)
    interpreter_model = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = _("Application settings")
        verbose_name_plural = _("Application settings")

    def __str__(self) -> str:
        return "Application settings"

    @classmethod
    def current(cls) -> AppSetting:
        return cls.objects.order_by("created_at").first() or cls.objects.create()

    def save(self, *args, **kwargs):
        """Keep it a singleton: a second row would mean two sets of rules.

        A second instance is folded onto the first rather than refused, so code
        that constructs one and saves it updates the settings instead of raising
        or quietly creating a rival row nothing reads.
        """
        if self._state.adding and type(self).objects.exists():
            existing = type(self).objects.order_by("created_at").first()
            self.pk = existing.pk
            # created_at is auto_now_add, so it only fills itself on insert.
            # Carrying the original forward keeps the column non-null.
            self.created_at = existing.created_at
            self.created_by_id = existing.created_by_id
            self._state.adding = False
            kwargs.pop("force_insert", None)
        super().save(*args, **kwargs)


class CountryCoverage(BaseModel):
    """A country Ma'at answers about, and how far along it is.

    Coverage is a decision, not a consequence of which sources happen to exist.
    Without a record of it, "do we cover Kenya" can only be answered by reading
    the source register and inferring, and a country being prepared, with
    sources configured but not yet trusted, is indistinguishable from one that
    is live.

    This is also the single source of truth for the country list the rest of the
    dashboard offers. A country absent from here is not offered anywhere, so
    nobody can narrow a search to a country Ma'at cannot answer for.
    """

    country = models.OneToOneField(
        "core.Country",
        on_delete=models.PROTECT,
        related_name="coverage",
    )
    #: Off when added. Adding a country records the intent; switching it on is
    #: the claim that Ma'at can answer for it, and that is a separate act
    #: somebody performs once the sources behind it are working.
    is_active = models.BooleanField(default=False)
    #: Why this country, or what is left before it goes live. Shown to staff.
    note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["country__name"]
        verbose_name = _("Country coverage")
        verbose_name_plural = _("Country coverage")

    def __str__(self) -> str:
        return f"{self.country.name} ({self.status})"


def switched_on(field: str = "country") -> Q:
    """Rows that are global, or belong to a country switched on in Settings.

    The one rule for spending anything on a country. Polling, retrieval, live
    lookups and the dashboard lists all ask this same question, so a country
    switched off stops costing anything everywhere at once, and a country
    switched on starts everywhere at once. What an off country already holds
    stays on record and is counted on the Settings page; it is simply not
    polled, not searched, not asked and not shown until the switch is thrown.

    `field` is the path to the country from the model being filtered.
    """
    return Q(**{f"{field}__isnull": True}) | Q(
        **{f"{field}__coverage__is_active": True, f"{field}__coverage__deleted_at__isnull": True}
    )
