"""Drop the words visitors typed, once their retention has run out.

    manage.py prune_raw_text            # delete what has expired
    manage.py prune_raw_text --dry-run  # count it without deleting

Ma'at promises in Settings to keep the exact wording of a question for a set
number of days and no longer. This is the command that keeps the promise. It
runs on the poller's loop, so an install that polls is an install that prunes.

Only `raw_text` goes. The paraphrase, the intent, the claim, the verdict and
the mention all stay, so a rumour raised in March still counts in September
and every published article keeps standing. What disappears is the sentence
somebody typed about their own health, money or family.

The expiry is stamped on each turn when it is written, from the setting as it
stood that day. Shortening the retention in Settings therefore takes effect
for new turns; to apply it to turns already on file, restamp them:

    manage.py prune_raw_text --restamp
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone

from appsettings.models import AppSetting
from verification.models import Turn

#: Rows per write. Pruning must never hold one long transaction over the
#: table the widget is writing to while somebody is mid-conversation.
BATCH = 500


class Command(BaseCommand):
    help = "Delete the raw text of turns whose retention has expired."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Count what would go, delete nothing.")
        parser.add_argument(
            "--restamp",
            action="store_true",
            help="Re-apply the current retention setting to turns already on file, then prune.",
        )

    def handle(self, *args, **options):
        now = timezone.now()

        if options["restamp"]:
            days = AppSetting.current().raw_text_retention_days
            moved = Turn.objects.filter(raw_expires_at__isnull=False).exclude(raw_text="").update(
                raw_expires_at=F("created_at") + timezone.timedelta(days=days)
            )
            self.stdout.write(f"{moved} turns restamped at {days} days.")

        expired = Turn.objects.filter(raw_expires_at__lte=now).exclude(raw_text="")
        count = expired.count()

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"{count} turns would be pruned."))
            return

        pruned = 0
        while True:
            ids = list(expired.values_list("id", flat=True)[:BATCH])
            if not ids:
                break
            # The stamp goes with the text: a turn with no words left has
            # nothing to expire, and leaving the date behind would make every
            # later run walk rows it has already cleared.
            pruned += Turn.objects.filter(id__in=ids).update(raw_text="", raw_expires_at=None)

        self.stdout.write(self.style.SUCCESS(f"{pruned} turns pruned."))
