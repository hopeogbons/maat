"""Ask a site what it offers before it is added to the register.

    manage.py discover_source https://nema.gov.ng
    manage.py discover_source --file candidates.txt --json out.json

Prints the door Ma'at would use and the configuration to store. Nothing is
written to the database; adding a source is a separate, deliberate act.
"""

from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from django.core.management.base import BaseCommand

from knowledge.discovery import discover


class Command(BaseCommand):
    help = "Probe one or more sites for an API, a feed or readable pages."

    def add_arguments(self, parser):
        parser.add_argument("urls", nargs="*")
        parser.add_argument("--file", help="A file with one address per line; # starts a comment.")
        parser.add_argument("--json", help="Write every finding to this file as JSON.")
        parser.add_argument("--workers", type=int, default=6, help="Sites probed at once. Each site is still asked one thing at a time.")

    def handle(self, *args, **options):
        urls = list(options["urls"])
        if options["file"]:
            for line in Path(options["file"]).read_text().splitlines():
                line = line.split("#", 1)[0].strip()
                if line:
                    urls.append(line)
        logging.getLogger("trafilatura").setLevel(logging.ERROR)
        findings = []
        with ThreadPoolExecutor(max_workers=max(1, options["workers"])) as pool:
            probed = pool.map(discover, urls)
        for finding in probed:
            url = finding.url
            findings.append(finding)
            detail = ""
            if finding.door == "api":
                detail = f"{finding.wp_api} ({finding.wp_posts_seen} posts seen)"
            elif finding.door == "feed":
                detail = ", ".join(f"{f['url']} [{f['entries']} entries{', full text' if f['full_text'] else ', summaries'}]" for f in finding.feeds)
            elif finding.door == "pages":
                detail = f"{finding.listing_links} links on the page; read {finding.trial_article['title'][:60]!r} ({finding.trial_article['chars']} chars)"
            else:
                detail = "; ".join(finding.notes)
            self.stdout.write(f"{finding.door:6} {url}  {detail}")
            self.stdout.flush()
        if options["json"]:
            Path(options["json"]).write_text(json.dumps([json.loads(f.as_json()) for f in findings], indent=1, ensure_ascii=False))
