#!/usr/bin/env python3
"""Start (or restart) the dev stack fully detached from the calling shell.

    python3 scripts/dev_up.py

Services (both under the production hostname, see the README):
  backend   https://maatverify.vercel.app:8765   backend/scripts/dev_server.sh   log /tmp/maat-backend.log
  frontend  https://maatverify.vercel.app:5174   npm run dev                     log /tmp/maat-vite.log
  poller    (no port)                      manage.py poll_feeds --loop     log /tmp/maat-poller.log

Stop them with scripts/dev_down.py - detached means Ctrl-C will not reach them.

Genuinely restarts: whatever is already listening on each port is stopped first,
otherwise the health check would be answered by the OLD process and stale code
would keep serving while the new one died on a port conflict.
"""

import os
import shutil
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENV = ROOT / "backend/.venv"
HOST = "maatverify.vercel.app"
BACKEND_PORT = 8765
FRONTEND_PORT = 5174

# -sTCP:LISTEN matters: plain `lsof -i tcp:PORT` also matches ESTABLISHED
# connections, i.e. every *client* of the port (the Vite proxy, open browser
# tabs), and freeing the port would kill those too.
LISTENERS = ["-sTCP:LISTEN"]

# The mkcert certificate is trusted by the browser, not necessarily by Python.
INSECURE = ssl.create_default_context()
INSECURE.check_hostname = False
INSECURE.verify_mode = ssl.CERT_NONE


def holders(port):
    result = subprocess.run(
        ["lsof", "-ti", f"tcp:{port}", *LISTENERS], capture_output=True, text=True, check=False
    )
    return [pid for pid in result.stdout.split() if pid.isdigit()]


def stop(port):
    """Kill whatever listens on `port`, so the health check cannot answer from it."""
    if not shutil.which("lsof"):
        print(f"  lsof unavailable; cannot free port {port} automatically")
        return
    pids = holders(port)
    if not pids:
        return
    subprocess.run(["kill", *pids], check=False)
    for _ in range(20):
        if not holders(port):
            print(f"  freed port {port} (was pid {' '.join(pids)})")
            return
        time.sleep(0.25)
    subprocess.run(["kill", "-9", *pids], check=False)
    time.sleep(0.5)
    print(f"  force-freed port {port} (was pid {' '.join(pids)})")


def start(name, command, cwd, log_path, health_url, port, env=None):
    stop(port)
    with open(log_path, "ab") as log:
        subprocess.Popen(
            command,
            cwd=cwd,
            env={**os.environ, **(env or {})},
            stdout=log,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    for _ in range(40):
        try:
            with urllib.request.urlopen(health_url, timeout=1, context=INSECURE) as response:
                if response.status < 500:
                    print(f"{name}: up ({health_url})")
                    return
        except Exception:
            time.sleep(0.5)
    print(f"{name}: FAILED to start - see {log_path}")
    sys.exit(1)


def activate_venv():
    """Same effect as `source backend/.venv/bin/activate` for everything we start."""
    os.environ["VIRTUAL_ENV"] = str(VENV)
    os.environ["PATH"] = f"{VENV / 'bin'}{os.pathsep}{os.environ.get('PATH', '')}"
    os.environ.pop("PYTHONHOME", None)
    print(f"venv: activated {VENV}")


POLLER_PIDFILE = "/tmp/maat-poller.pid"


def start_poller():
    """The feed poller has no port to health-check, so it is tracked by pid."""
    stop_poller()
    with open("/tmp/maat-poller.log", "ab") as log:
        proc = subprocess.Popen(
            [str(VENV / "bin/python"), "manage.py", "poll_feeds", "--loop"],
            cwd=ROOT / "backend",
            env={**os.environ},
            stdout=log,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    Path(POLLER_PIDFILE).write_text(str(proc.pid))
    time.sleep(1.5)
    if proc.poll() is None:
        print(f"poller: up (pid {proc.pid}, log /tmp/maat-poller.log)")
    else:
        print("poller: FAILED to start - see /tmp/maat-poller.log")


def stop_poller():
    try:
        pid = int(Path(POLLER_PIDFILE).read_text())
    except (FileNotFoundError, ValueError):
        return
    subprocess.run(["kill", str(pid)], check=False, stderr=subprocess.DEVNULL)
    Path(POLLER_PIDFILE).unlink(missing_ok=True)


def main():
    activate_venv()
    scheme = "https" if (ROOT / "frontend/.certs/dev.pem").exists() else "http"
    backend = f"{scheme}://{HOST}:{BACKEND_PORT}"
    start(
        "backend",
        [str(ROOT / "backend/scripts/dev_server.sh"), f"{HOST}:{BACKEND_PORT}"],
        ROOT / "backend",
        "/tmp/maat-backend.log",
        f"{backend}/api/health/",
        BACKEND_PORT,
    )
    start(
        "frontend",
        ["npm", "run", "dev", "--", "--host", HOST, "--port", str(FRONTEND_PORT), "--strictPort"],
        ROOT / "frontend",
        "/tmp/maat-vite.log",
        f"{scheme}://{HOST}:{FRONTEND_PORT}/",
        FRONTEND_PORT,
        env={"VITE_DEV_API_PROXY": backend},
    )
    start_poller()


if __name__ == "__main__":
    main()
