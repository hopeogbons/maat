#!/usr/bin/env bash
# Runs the backend for local development.
#
# If a locally trusted certificate exists (made with mkcert, see the README;
# frontend/.certs/dev.pem by default), Django is served over https by gunicorn,
# which browsers require for hostnames such as maatverify.vercel.app. Otherwise it
# falls back to Django's own runserver over plain http.
#
# Both modes reload on code changes; the https mode also reloads when .env
# changes, so edits such as FRONTEND_URL apply without a restart.
#
#   backend/scripts/dev_server.sh                 # 127.0.0.1:8765
#   backend/scripts/dev_server.sh 127.0.0.1:8000  # another bind address
set -euo pipefail
cd "$(dirname "$0")/.."

BIND="${1:-127.0.0.1:8765}"
CERT="${DEV_CERT:-../frontend/.certs/dev.pem}"
KEY="${DEV_KEY:-../frontend/.certs/dev-key.pem}"

if [[ -f "$CERT" && -f "$KEY" ]]; then
  echo "Serving https://${BIND}/ (certificate: ${CERT})"
  exec .venv/bin/gunicorn config.wsgi:application \
    --bind "$BIND" \
    --certfile "$CERT" \
    --keyfile "$KEY" \
    --reload \
    --reload-extra-file .env \
    --workers 2 \
    --access-logfile -
else
  echo "No certificate at ${CERT}; serving http://${BIND}/"
  exec .venv/bin/python manage.py runserver "$BIND"
fi
