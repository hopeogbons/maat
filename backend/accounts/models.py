"""Everything about a person that Django's own user row does not hold.

Django's `auth.User` carries what authentication needs: a username, a password
hash, staff and superuser flags. Anything else about the person belongs here, so
the login path stays small and a new field about a human being never means a
migration on the table that guards the door.

One profile per user, created the moment the user is, so no code ever has to
handle a user without one.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _

from core.models import BaseModel


class Profile(BaseModel):
    """The personal details behind a sign-in."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    first_name = models.CharField(max_length=120, blank=True)
    last_name = models.CharField(max_length=120, blank=True)
    #: What this person does here, shown beside their name in the dashboard.
    job_title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    avatar_url = models.URLField(blank=True)
    country = models.ForeignKey(
        "core.Country",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="profiles",
    )
    timezone = models.ForeignKey(
        "core.TimeZone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="profiles",
        help_text=_("Used to show times in the reader's own day."),
    )

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [models.Index(fields=["last_name", "first_name"])]

    def __str__(self) -> str:
        return self.display_name

    @property
    def full_name(self) -> str:
        return " ".join(part for part in (self.first_name, self.last_name) if part)

    @property
    def display_name(self) -> str:
        """A name to print. Falls back to the username rather than to nothing."""
        return self.full_name or self.user.get_username()


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="accounts_create_profile")
def create_profile(sender, instance, created, **kwargs):
    """Give every new user a profile, seeded from whatever the user row knows.

    get_or_create rather than create: a fixture, a data migration or a second
    save must never raise here, because failing this signal would make creating
    a user impossible.
    """
    if not created:
        return
    Profile.objects.get_or_create(
        user=instance,
        defaults={
            "first_name": getattr(instance, "first_name", "") or "",
            "last_name": getattr(instance, "last_name", "") or "",
        },
    )
