# Deploying the backend to your VPS

One-time server setup (Ubuntu/Debian, as a sudo user):

```bash
# 1. System packages
sudo apt update && sudo apt install -y python3 python3-venv postgresql nginx git certbot python3-certbot-nginx

# 2. A dedicated system user and app directory
sudo useradd --system --create-home --shell /bin/bash maat
sudo mkdir -p /srv/maat && sudo chown maat:maat /srv/maat

# 3. Database
sudo -u postgres psql -c "CREATE ROLE maat WITH LOGIN PASSWORD 'choose-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE maat OWNER maat;"

# 4. Code
sudo -u maat git clone git@github.com:hopeogbons/maat.git /srv/maat

# 5. Environment file (fill in real values, see backend/.env.example)
sudo -u maat cp /srv/maat/backend/.env.example /srv/maat/backend/.env
sudo -u maat nano /srv/maat/backend/.env
#   DEBUG=False
#   SECRET_KEY=<generated>
#   ALLOWED_HOSTS=api.yourdomain.com
#   DATABASE_URL=postgres://maat:<password>@localhost:5432/maat
#   CORS_ALLOWED_ORIGINS=https://<your-app>.vercel.app
#   CORS_ALLOWED_ORIGIN_REGEXES=^https://<your-app>-.*\.vercel\.app$
#   CSRF_TRUSTED_ORIGINS=https://<your-app>.vercel.app
#   FRONTEND_URL=https://<your-app>.vercel.app

# 6. Let the maat user restart its own services without a password
echo "maat ALL=(root) NOPASSWD: /bin/systemctl restart maat-api maat-poller, /bin/systemctl status maat-api maat-poller" | sudo tee /etc/sudoers.d/maat-api

# 7. First install (creates venv, migrates, loads the source register, collects static, starts nothing yet)
sudo -u maat bash -c 'cd /srv/maat/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python manage.py migrate && .venv/bin/python manage.py seed_sources && .venv/bin/python manage.py collectstatic --noinput'

# 7b. The headless browser for sources read through a browser: system libraries
#     once as root, then the browser itself as the maat user
sudo /srv/maat/backend/.venv/bin/python -m playwright install-deps chromium
sudo -u maat /srv/maat/backend/.venv/bin/python -m playwright install chromium

# 8. systemd + nginx
sudo cp /srv/maat/backend/deploy/maat-api.service /srv/maat/backend/deploy/maat-poller.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now maat-api maat-poller
sudo cp /srv/maat/backend/deploy/nginx-maat-api.conf /etc/nginx/sites-available/maat-api
sudo sed -i 's/api.yourdomain.com/api.YOUR-REAL-DOMAIN/' /etc/nginx/sites-available/maat-api
sudo ln -s /etc/nginx/sites-available/maat-api /etc/nginx/sites-enabled/maat-api
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.YOUR-REAL-DOMAIN

# 9. Verify
curl https://api.YOUR-REAL-DOMAIN/api/health/
```

Every later release:

```bash
ssh maat@your-vps 'bash /srv/maat/backend/deploy/deploy.sh'
```

## Sites that need a browser

A source whose schema carries `"render": true` is read through headless
Chromium. Step 7b installs it; `deploy.sh` keeps it current on every release.
The poller opens the browser only while polling such a source and closes it
after. Probe a JavaScript site with `discover_source --render <address>`.

## Adding a source

Ask the site what it offers before anything is written:

```
python manage.py discover_source https://nema.gov.ng
```

It reports the door Ma'at would use (API, feed, or pages) and the configuration
to store, having verified each by reading it. Add the row to
`knowledge/fixtures/register.json`, run `seed_sources`, then `poll_feeds --force`
and confirm documents arrived. The rules each door runs under are in
`docs/sources.md`.
