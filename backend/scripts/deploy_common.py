"""What deploy_reset.py and deploy_seed.py share: the release's environment
and interpreter, and the poller restart the deploy user is allowed."""

import os
import subprocess
import sys
from pathlib import Path

RELEASE = Path(__file__).resolve().parent.parent
VENV_PY = Path("/srv/maat/shared/venv/bin/python")
ENV_FILE = Path("/etc/maat.env")
POLLER = "maat-poller"


def load_env():
    """Read /etc/maat.env the way systemd does, quotes stripped, file wins."""
    if not ENV_FILE.exists():
        sys.exit(f"error: {ENV_FILE} not found; run this on the server as the deploy user.")
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if len(value) > 1 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            if key != "PATH":
                os.environ[key] = value


def run(*argv):
    return subprocess.run([str(VENV_PY), *argv], cwd=RELEASE).returncode


def restart_poller():
    subprocess.run(["sudo", "/usr/bin/systemctl", "restart", POLLER], check=False)
    print(f"{POLLER}: restarted")
