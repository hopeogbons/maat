"""Poll the feeds that are due.

    manage.py poll_feeds                 # once: poll what is due, then exit
    manage.py poll_feeds --force         # once: poll everything, ignoring cadence
    manage.py poll_feeds --loop          # keep running, checking every few minutes

The loop is the scheduler. Each source carries its own cadence, so the loop only
has to wake often enough to notice one has come due; it never polls a source
faster than that source asked for. In production it runs as a systemd service
(deploy/maat-poller.service). In development, dev_up.py starts it.
"""

from __future__ import annotations

import random
import signal
import time

from django.core.management.base import BaseCommand

from knowledge.feeds import poll_due

#: How often the loop looks for due sources. The finest cadence any source can
#: have is hourly, so five minutes means a source is polled at most five minutes
#: late and the loop itself is idle almost all the time.
TICK_SECONDS = 300


class Command(BaseCommand):
    help = "Poll every active feed whose cadence has elapsed."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Ignore the cadence and poll everything.")
        parser.add_argument("--loop", action="store_true", help="Keep running and poll whenever a source comes due.")
        parser.add_argument("--every", type=int, default=TICK_SECONDS, help="Seconds between checks when looping.")

    def handle(self, *args, **options):
        if not options["loop"]:
            self._tick(force=options["force"])
            return

        stop = {"now": False}

        def _stop(*_):
            stop["now"] = True

        signal.signal(signal.SIGTERM, _stop)
        signal.signal(signal.SIGINT, _stop)
        self.stdout.write(f"Polling loop up, checking every {options['every']}s.")
        while not stop["now"]:
            try:
                self._tick(force=False)
            except Exception as exc:  # the loop must survive anything one tick does
                self.stderr.write(f"tick failed: {exc.__class__.__name__}: {exc}")
            # Jitter so a fleet of pollers never hits a publisher in unison.
            for _ in range(options["every"] + random.randint(0, 30)):
                if stop["now"]:
                    break
                time.sleep(1)
        self.stdout.write("Polling loop stopped.")

    def _tick(self, *, force: bool) -> None:
        runs = poll_due(force=force)
        if not runs:
            return
        for run in runs:
            if run.status == run.Status.FAILED:
                self.stdout.write(self.style.ERROR(f"{run.source.name}: {run.error}"))
            else:
                self.stdout.write(
                    f"{run.source.name}: {run.documents_seen} seen, "
                    f"{run.documents_added} added, {run.chunks_written} passages"
                )
