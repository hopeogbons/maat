#!/usr/bin/env python
"""Seed the permanent structure a Ma'at install needs before it can run.

Run from beside manage.py:

    python bootstrap_backend.py [--with-superuser] [--skip cmd ...]

Everything here is system configuration, not content: the ISO catalogues that
let the application describe anywhere in the world. It invents no documents, no
sources and no rumours, so it is safe against a live install and safe to run
again.

Seed content is deliberately not here. The corpus and the known rumours used to
exercise the engine come later, from their own command, and that one must never
run against production.
"""

from __future__ import annotations

import os
import sys

import django
from django.core.management import call_command

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

#: Order matters. Countries link to currencies, so the currencies exist first.
COMMANDS = [
    "seed_currencies_and_timezones",
    "sync_countries_and_states",
]


def main(argv=None) -> int:
    argv = list(argv or sys.argv[1:])

    with_superuser = "--with-superuser" in argv
    argv = [arg for arg in argv if arg != "--with-superuser"]

    skip: set[str] = set()
    if "--skip" in argv:
        skip = set(argv[argv.index("--skip") + 1 :])

    call_command("migrate", interactive=False)

    for command in COMMANDS:
        if command in skip:
            print(f"skipping {command}")
            continue
        print(f"running {command}")
        call_command(command)

    if with_superuser:
        call_command("createsuperuser", interactive=not os.environ.get("DJANGO_SUPERUSER_PASSWORD"))

    print("Bootstrap complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
