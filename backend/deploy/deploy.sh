#!/usr/bin/env bash
# Run ON THE VPS to pull and roll out the latest backend.
#   ssh maat@your-vps 'bash /srv/maat/backend/deploy/deploy.sh'
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/maat}"
BACKEND_DIR="$APP_DIR/backend"
VENV="$BACKEND_DIR/.venv"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
echo "==> Pulling $BRANCH"
git fetch --prune origin
git checkout -q "$BRANCH"
git reset --hard "origin/$BRANCH"

cd "$BACKEND_DIR"
if [ ! -x "$VENV/bin/python" ]; then
  echo "==> Creating virtualenv"
  python3 -m venv "$VENV"
fi

echo "==> Installing dependencies"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r requirements.txt

echo "==> Running checks"
"$VENV/bin/python" manage.py check --deploy --fail-level ERROR

echo "==> Migrating database"
"$VENV/bin/python" manage.py migrate --noinput

echo "==> Collecting static files"
"$VENV/bin/python" manage.py collectstatic --noinput --clear

echo "==> Restarting service"
sudo systemctl restart maat-api
sudo systemctl --no-pager --lines=5 status maat-api

echo "==> Done"
