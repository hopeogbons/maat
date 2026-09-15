#!/usr/bin/env python3
"""Stop the dev stack started by dev_up.py.

    python3 scripts/dev_down.py

Stops by port rather than by recorded pid: the stack is often started by one
shell and stopped by another, and a pidfile goes stale the moment a service is
restarted by hand. Whatever holds the port is what is serving.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dev_up import BACKEND_PORT, FRONTEND_PORT, VENV, holders, stop, stop_poller  # noqa: E402

SERVICES = [("backend", BACKEND_PORT), ("frontend", FRONTEND_PORT)]


def deactivate_venv():
    """Same effect as `deactivate`: the venv only lived inside the servers we stop."""
    os.environ.pop("VIRTUAL_ENV", None)
    print(f"venv: deactivated {VENV}")


def main():
    deactivate_venv()
    stop_poller()
    print("poller: stopped")
    for name, port in SERVICES:
        if not holders(port):
            print(f"{name}: not running (port {port} free)")
            continue
        stop(port)
        print(f"{name}: stopped" if not holders(port) else f"{name}: still holding port {port}")


if __name__ == "__main__":
    main()
