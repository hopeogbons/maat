"""Gunicorn configuration for the VPS. Used by deploy/maat-api.service."""

import multiprocessing
import os

bind = os.environ.get("GUNICORN_BIND", "127.0.0.1:8000")
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
timeout = 60
graceful_timeout = 30
keepalive = 5

# Log to stdout/stderr so journald captures everything.
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOGLEVEL", "info")

# nginx is the only client, so trust its forwarded headers.
forwarded_allow_ips = "127.0.0.1"
