"""Gunicorn configuration for the VPS.

The deploy kit's shared gunicorn@maat unit runs, from /srv/maat/current:

    gunicorn --config gunicorn.conf.py $DJANGO_WSGI_MODULE

The box is 1 vCPU / 2 GB shared with two other sites, so the shape is the
kit's: one worker with a few threads (requests spend their time waiting on
OpenAI, not computing), a unix socket that Nginx reaches through /run/gunicorn,
and quiet logs. Each value can be overridden from /etc/maat.env with the
GUNICORN_* variable named beside it. Local development never reads this file:
scripts/dev_server.sh passes its own flags.
"""

import os


def _env_int(name: str, default: int) -> int:
    return int(os.environ.get(name, default))


# The socket the kit's Nginx site proxies to. umask 007 makes it 0660
# deploy:www-data, which is what lets Nginx connect.
bind = os.environ.get("GUNICORN_BIND", "unix:/run/gunicorn/maat.sock")
umask = 0o007

# One core: threads buy concurrency for I/O-bound requests, workers would
# fight over the CPU and each costs the whole application's memory.
workers = _env_int("GUNICORN_WORKERS", 1)
worker_class = os.environ.get("GUNICORN_WORKER_CLASS", "gthread")
threads = _env_int("GUNICORN_THREADS", 4)

# The chat streams, so the first byte is quick, but a whole answer can take a
# while. Nginx's proxy_read_timeout for the API matches this.
timeout = _env_int("GUNICORN_TIMEOUT", 180)
graceful_timeout = 30
keepalive = 5

# Import Django once in the master, before forking.
preload_app = True

# Recycle the worker now and then to bound slow leaks.
max_requests = 300
max_requests_jitter = 30

# Nginx already logs every request; gunicorn reports only errors and startup.
# GUNICORN_ACCESSLOG=- turns request logging back on.
accesslog = os.environ.get("GUNICORN_ACCESSLOG") or None
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOGLEVEL", "warning")

# Nginx is the only client. Over the unix socket the peer is trusted for the
# X-Forwarded-* headers; this matters only when binding to TCP instead.
forwarded_allow_ips = "127.0.0.1"
