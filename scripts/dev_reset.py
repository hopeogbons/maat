#!/usr/bin/env python3
"""Wipe the local database clean, keeping sign-in and the ISO catalogues.

    python3 scripts/dev_reset.py          # asks first
    python3 scripts/dev_reset.py --yes

Pairs with dev_seed.py:

    python3 scripts/dev_reset.py --yes && python3 scripts/dev_seed.py

The poller is stopped for the wipe and started again if it was running; the
backend and frontend stay up. Its server sibling is scripts/deploy_reset.py
in the release.
"""

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dev_up import POLLER_PIDFILE, ROOT, VENV, activate_venv, start_poller, stop_poller  # noqa: E402


def main():
    sys.stdout.reconfigure(line_buffering=True)
    activate_venv()
    was_running = Path(POLLER_PIDFILE).exists()
    stop_poller()
    result = subprocess.run([str(VENV / "bin/python"), "manage.py", "reset", *sys.argv[1:]], cwd=ROOT / "backend")
    if was_running:
        start_poller()
        print("poller: restarted")
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
