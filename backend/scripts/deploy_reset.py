#!/usr/bin/env python3
"""Wipe the live database clean, keeping only what signing in needs; the
server sibling of the repo's scripts/dev_reset.py.

Run ON THE VPS as the deploy user, from the active release:

    cd /srv/maat/current && python3 scripts/deploy_reset.py          # asks first
    cd /srv/maat/current && python3 scripts/deploy_reset.py --yes

Pairs with deploy_seed.py. No backup is taken and there is no DEBUG guard:
the confirmation is the only thing between you and an empty site. The poller
is restarted afterwards; gunicorn stays up.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from deploy_common import load_env, restart_poller, run  # noqa: E402


def main():
    load_env()
    code = run("manage.py", "reset", *sys.argv[1:])
    if code == 0:
        restart_poller()
    return code


if __name__ == "__main__":
    sys.exit(main())
