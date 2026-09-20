#!/usr/bin/env python3
"""Seed the live database: the ISO catalogues, then the source register; the
server sibling of the repo's scripts/dev_seed.py.

Run ON THE VPS as the deploy user, from the active release:

    cd /srv/maat/current && python3 scripts/deploy_seed.py

Idempotent and never touches users. The poller is restarted afterwards so it
reads the register afresh.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deploy_common import load_env, restart_poller, run  # noqa: E402


def main():
    load_env()
    for step in (["bootstrap_backend.py"], ["manage.py", "seed_sources"]):
        code = run(*step)
        if code:
            return code
    restart_poller()
    return 0


if __name__ == "__main__":
    sys.exit(main())
