"""Write the public page for every rumour that has earned one but lacks it.

    manage.py publish_rumours            # only rumours with no article
    manage.py publish_rumours --rewrite  # rewrite the ones that have one too

Publication normally happens in the request that crosses the threshold. This
is the repair for the two ways that can leave nothing behind: the model
provider was down, or the rumour was published by hand in the admin.
"""

from django.core.management.base import BaseCommand

from verification.models import Rumour
from verification.publishing import publish


class Command(BaseCommand):
    help = "Write the missing public pages for published rumours."

    def add_arguments(self, parser):
        parser.add_argument("--rewrite", action="store_true", help="Rewrite pages that already exist.")

    def handle(self, *args, **options):
        rumours = Rumour.active.filter(status=Rumour.Status.PUBLISHED)
        if not options["rewrite"]:
            rumours = rumours.filter(article__isnull=True)
        written = 0
        for rumour in rumours:
            article = publish(rumour)
            written += 1
            self.stdout.write(f"  {article.slug}: {', '.join(t.name for t in article.tags.all()) or 'no topic'}")
        self.stdout.write(self.style.SUCCESS(f"{written} articles written."))
