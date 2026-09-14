"""The shared base model and the ISO reference catalogues.

Two things live here, and every other app builds on them.

`BaseModel` is the abstract base: a UUID primary key, timestamps, who did what,
and soft delete. Inheriting it means a row can be retired without being erased,
which matters in a product whose whole claim is that the record is kept.

The catalogues are the plain facts an application needs before it can describe
anywhere in the world: countries, their subdivisions, currencies and time zones.
They are seeded from ISO and CLDR data by the two commands in
`core/management/commands`, never typed by hand, and they hold no opinion about
Ma'at. Sources and claims point at them.
"""

from __future__ import annotations

import logging
from uuid import uuid4

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from core.context import get_current_user

logger = logging.getLogger(__name__)


class SoftDeleteQuerySet(models.QuerySet):
    def active(self):
        return self.filter(deleted_at__isnull=True)

    def deleted(self):
        return self.filter(deleted_at__isnull=False)

    def delete(self):
        """Soft delete the whole queryset. `hard_delete` is the real thing."""
        return self.update(deleted_at=timezone.now(), deleted_by=get_current_user())

    def hard_delete(self):
        return super().delete()


class ActiveManager(models.Manager):
    """Only rows that have not been soft-deleted. Reached as `Model.active`."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).active()


class BaseModel(models.Model):
    """UUID primary key, timestamps, audit columns and soft delete.

    Two managers on purpose. `objects` sees everything, including retired rows,
    because a record that can vanish from every query is a record you cannot
    audit. `active` is the one day-to-day code should reach for.

    created_by and updated_by fill themselves from the request context, so
    callers never pass a user. NULL means the system did it: a scheduled poll,
    a seed command, a shell session.
    """

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created",
        editable=False,
        help_text=_("Who created this row. Empty means the system did."),
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated",
        editable=False,
        help_text=_("Who last changed this row. Empty means the system did."),
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_deleted",
        editable=False,
        help_text=_("Who retired this row. Empty means the system did."),
    )

    #: Sees every row, retired ones included, because a record that can vanish
    #: from every query is a record you cannot audit. Built from the soft-delete
    #: queryset so `Model.objects.filter(...).delete()` retires rows too: one
    #: manager deleting softly while the other deletes for real would be a trap.
    objects = models.Manager.from_queryset(SoftDeleteQuerySet)()
    #: The one day-to-day code should reach for.
    active = ActiveManager()

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def save(self, *args, **kwargs):
        user = get_current_user()
        if user is not None:
            if self._state.adding and self.created_by_id is None:
                self.created_by = user
            self.updated_by = user
            fields = kwargs.get("update_fields")
            if fields is not None:
                kwargs["update_fields"] = {*fields, "updated_by"}
        super().save(*args, **kwargs)

    def soft_delete(self, using: str | None = None) -> None:
        """Retire the row without erasing it."""
        self.deleted_at = timezone.now()
        self.deleted_by = get_current_user()
        self.save(using=using, update_fields=["deleted_at", "deleted_by", "updated_at"])
        logger.info("Soft deleted %s (pk=%s)", self.__class__.__name__, self.pk)

    def restore(self, using: str | None = None) -> None:
        self.deleted_at = None
        self.deleted_by = None
        self.save(using=using, update_fields=["deleted_at", "deleted_by", "updated_at"])

    def delete(self, *args, **kwargs):
        """Soft by default. Pass hard=True to really remove the row."""
        hard = kwargs.pop("hard", False)
        using = kwargs.pop("using", None)
        kwargs.pop("keep_parents", None)
        if hard:
            logger.info("Hard deleting %s (pk=%s)", self.__class__.__name__, self.pk)
            return super().delete(using=using, **kwargs)
        self.soft_delete(using=using)
        return (0, {})


class Currency(BaseModel):
    """ISO 4217. Reference data: Ma'at has no paid tier yet."""

    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=128)
    numeric = models.CharField(max_length=3, blank=True)
    #: Digits after the decimal point. 2 for most, 0 for the yen, 3 for the dinar.
    minor_units = models.PositiveSmallIntegerField(null=True, blank=True)
    symbol = models.CharField(max_length=8, blank=True)

    class Meta:
        verbose_name_plural = _("Currencies")
        ordering = ["code"]
        constraints = [
            models.CheckConstraint(
                condition=Q(code__regex=r"^[A-Za-z]{3}$"), name="currency_code_three_letters"
            )
        ]
        indexes = [models.Index(fields=["code"]), models.Index(fields=["name"])]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class TimeZone(BaseModel):
    """IANA time zone names, read from the standard library's own database."""

    name = models.CharField(max_length=64, unique=True)

    class Meta:
        verbose_name = _("Time zone")
        verbose_name_plural = _("Time zones")
        ordering = ["name"]
        indexes = [models.Index(fields=["name"])]

    def __str__(self) -> str:
        return self.name.replace("_", " ")


class Country(BaseModel):
    """ISO 3166-1.

    A source or a claim points here to say where it applies. Pointing nowhere
    means global, so there is no "World" row to keep in step.
    """

    name = models.CharField(max_length=128, unique=True)
    iso2 = models.CharField(max_length=2, unique=True)
    iso3 = models.CharField(max_length=3, unique=True)
    numeric_code = models.CharField(max_length=3, unique=True)
    phone_code = models.CharField(max_length=10, blank=True)
    flag_emoji = models.CharField(max_length=8, blank=True)
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name="countries",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name_plural = _("Countries")
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=Q(iso2__regex=r"^[A-Za-z]{2}$"), name="country_iso2_two_letters"
            ),
            models.CheckConstraint(
                condition=Q(iso3__regex=r"^[A-Za-z]{3}$"), name="country_iso3_three_letters"
            ),
            models.CheckConstraint(
                condition=Q(numeric_code__regex=r"^[0-9]{3}$"), name="country_numeric_three_digits"
            ),
        ]
        indexes = [models.Index(fields=["name"]), models.Index(fields=["iso2"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.iso2})"


class StateProvince(BaseModel):
    """ISO 3166-2 subdivisions: states, provinces, regions, territories."""

    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name="states")
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=128)
    #: What the country calls it: State, Province, Region, Federal Capital Territory.
    kind = models.CharField(max_length=64, blank=True)
    timezone = models.ForeignKey(
        TimeZone,
        on_delete=models.PROTECT,
        related_name="states",
        null=True,
        blank=True,
        help_text=_("Left empty by the seed: no offline dataset maps subdivisions to zones."),
    )

    class Meta:
        verbose_name = _("State or province")
        verbose_name_plural = _("States and provinces")
        ordering = ["name"]
        unique_together = ("country", "code")
        indexes = [
            models.Index(fields=["country", "name"]),
            models.Index(fields=["country", "code"]),
        ]

    def __str__(self) -> str:
        return f"{self.name}, {self.country.iso2}"
