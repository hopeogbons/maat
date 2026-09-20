"""Wipe the database clean, keeping only what signing in needs.

    manage.py reset          # asks first
    manage.py reset --yes    # for scripts

Kept: users, groups, permissions, sessions, API tokens and profiles, plus the
migration and content-type bookkeeping the schema itself depends on. Every
other table is emptied, uploaded files are deleted and the cache is flushed.
The reference catalogues go too: `seed` puts them back.

Rows are deleted rather than truncated because a kept table (the profile) has
foreign keys into wiped ones (country, time zone); TRUNCATE refuses that
outright, and CASCADE would take the profiles with it. Those keys are nulled
first, then everything else goes in one transaction with constraints deferred.
"""

import shutil

from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction

#: Apps whose tables survive a reset.
KEEP = {"auth", "contenttypes", "sessions", "authtoken", "accounts"}


def partition():
    """Concrete models to keep and to wipe, one entry per table."""
    keep, wipe, seen = [], [], set()
    for model in apps.get_models(include_auto_created=True):
        table = model._meta.db_table
        if model._meta.proxy or table in seen:
            continue
        seen.add(table)
        (keep if model._meta.app_label in KEEP else wipe).append(model)
    return keep, wipe


class Command(BaseCommand):
    help = "Empty every table except users, profiles and sessions."

    def add_arguments(self, parser):
        parser.add_argument("--yes", action="store_true", help="Do not ask for confirmation.")

    def handle(self, *args, **options):
        db = connection.settings_dict
        if not options["yes"]:
            answer = input(f"Wipe database {db['NAME']!r} on {db['HOST'] or 'localhost'}? [y/N] ")
            if answer.strip().lower() not in ("y", "yes"):
                raise CommandError("Nothing was changed.")

        keep, wipe = partition()
        wiped_tables = {m._meta.db_table for m in wipe}
        removed = {}
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL DEFERRED")
            for model in keep:
                for field in model._meta.concrete_fields:
                    if field.is_relation and field.related_model._meta.db_table in wiped_tables:
                        if not field.null:
                            raise CommandError(f"{model._meta.label}.{field.name} cannot be cleared.")
                        model._base_manager.update(**{field.name: None})
            for model in wipe:
                cursor.execute(f"DELETE FROM {connection.ops.quote_name(model._meta.db_table)}")
                if cursor.rowcount:
                    removed[model._meta.db_table] = cursor.rowcount
            for statement in connection.ops.sequence_reset_sql(no_style(), wipe):
                cursor.execute(statement)

        files = 0
        media = settings.MEDIA_ROOT
        if media.exists():
            for child in media.iterdir():
                files += sum(1 for f in child.rglob("*") if f.is_file()) if child.is_dir() else 1
                shutil.rmtree(child) if child.is_dir() else child.unlink()
        cache.clear()

        for table, count in sorted(removed.items()):
            self.stdout.write(f"  {table}: {count}")
        self.stdout.write(self.style.SUCCESS(
            f"{sum(removed.values())} rows removed from {len(removed)} tables, {files} files deleted, cache flushed."
        ))
