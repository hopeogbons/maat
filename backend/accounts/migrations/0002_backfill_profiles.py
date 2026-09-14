"""Give the users who existed before this model a profile.

The signal in accounts.models only fires when a user is created, so anyone
already in the table would otherwise be the one person in the system without
a profile, and every template that reads one would have to guard against it.
"""

from django.db import migrations


def create_missing_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Profile = apps.get_model("accounts", "Profile")
    existing = set(Profile.objects.values_list("user_id", flat=True))
    Profile.objects.bulk_create(
        [
            Profile(user_id=user.pk, first_name=user.first_name or "", last_name=user.last_name or "")
            for user in User.objects.exclude(pk__in=existing)
        ]
    )


def noop(apps, schema_editor):
    """Reversing this would delete profiles people may have filled in."""


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [migrations.RunPython(create_missing_profiles, noop)]
