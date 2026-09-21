#!/usr/bin/env python3
"""Seed the local database: the ISO catalogues, the source register, then coverage for its countries.

    python3 scripts/dev_seed.py

Idempotent, so it doubles as a repair for a register edited by hand. Never
touches users. Its server sibling is scripts/deploy_seed.py in the release.
"""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dev_up import ROOT, VENV, activate_venv  # noqa: E402

STEPS = [
    ["bootstrap_backend.py"],
    ["manage.py", "seed_sources"],
    ["manage.py", "seed_coverage"],
]


def main():
    sys.stdout.reconfigure(line_buffering=True)
    activate_venv()
    for step in STEPS:
        result = subprocess.run([str(VENV / "bin/python"), *step], cwd=ROOT / "backend")
        if result.returncode:
            return result.returncode
    return 0


if __name__ == "__main__":
    sys.exit(main())
