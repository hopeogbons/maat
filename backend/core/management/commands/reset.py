"""Wipe the content clean, keeping sign-in, the catalogues and Settings.

    manage.py reset          # asks first
    manage.py reset --yes    # for scripts

Kept: users, groups, permissions, sessions, API tokens and profiles; the ISO
catalogues of countries, states, currencies and time zones; Settings, meaning
the countries covered and their switches, the thresholds, the rate limits and
the retention; and the migration and content-type bookkeeping the schema
itself depends on. Every other table is emptied, uploaded files are deleted
and the cache is flushed.

The line is setup versus content. An install that has been set up once stays
set up: the catalogues are fixed facts about the world, and coverage and the
thresholds are decisions already made. What a reset removes is what the
install has taken in since: sources, documents, passages, conversations,
claims, rumours, articles and the Telegram bot.

Rows are deleted rather than truncated because kept tables have foreign keys
into wiped ones and wiped tables into kept ones; TRUNCATE refuses both, and
CASCADE would take the kept rows with it. Any kept-side key into a wiped
table is nulled first, then everything else goes in one transaction with
constraints deferred.
"""

import shutil

from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction

#: Apps whose tables survive a reset. `core` is the ISO catalogues and nothing
#: else; `appsettings` is coverage and the thresholds. Whole apps rather than a
#: list of models, so a table added to either later is kept without a change
#: here.
KEEP = {"auth", "contenttypes", "sessions", "authtoken", "accounts", "core", "appsettings"}


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
