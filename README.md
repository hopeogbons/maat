# maat

Django REST API (`backend/`) plus a React single-page app (`frontend/`).
The frontend is deployed to Vercel and calls the backend, which runs on a VPS
behind nginx. PostgreSQL is the only supported database.

```
maat/
├── backend/      Django 6 + Django REST Framework, gunicorn, PostgreSQL
│   ├── api/      the API app (health endpoint lives here)
│   ├── config/   settings, root urls, wsgi
│   ├── deploy/   systemd unit, nginx site, deploy script, VPS guide
│   └── scripts/  create_local_db.sh
└── frontend/     Vite + React + TypeScript, deployed to Vercel
    └── src/lib/api.ts   the one place that talks to the backend
```

## Local development

Prerequisites: Python 3.12+, Node 20+, a running PostgreSQL server.

```bash
# 1. Database (asks for sudo once; creates role "maat" / password "maat" / db "maat")
backend/scripts/create_local_db.sh

# 2. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # then set SECRET_KEY to anything; DEBUG=True is fine locally
.venv/bin/python manage.py migrate
.venv/bin/python manage.py runserver        # http://127.0.0.1:8000

# 3. Frontend (second terminal)
cd frontend
npm install
npm run dev                                 # http://localhost:5173
```

Open http://localhost:5173. The page calls `/api/health/`, which the Vite dev
server proxies to Django, so you should see "Backend connected" with
`database: ok`. No CORS configuration is needed in development.

Useful commands:

```bash
cd backend && .venv/bin/python manage.py test          # backend tests (needs CREATEDB on the role)
cd frontend && npm run build                          # type-check + production build
```

## How the frontend finds the backend

`frontend/src/lib/api.ts` reads `VITE_API_BASE_URL` at build time.

| Environment | `VITE_API_BASE_URL` | Requests go to |
|-------------|---------------------|----------------|
| `npm run dev` | empty | `/api/...` on Vite, proxied to Django on :8000 |
| Vercel | `https://api.yourdomain.com` | the VPS directly |

Because production is cross-origin, Django must list the Vercel URL(s) in
`CORS_ALLOWED_ORIGINS` (and `CSRF_TRUSTED_ORIGINS` once you add auth). Both
are environment variables, see `backend/.env.example`.

## Deploying

**Backend to the VPS:** follow `backend/deploy/README.md`. After the one-time
setup, each release is `bash /srv/maat/backend/deploy/deploy.sh` on the server.

**Frontend to Vercel:**

1. Import this GitHub repo in Vercel.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite
   (`npm run build`, output `dist`).
3. Add the environment variable `VITE_API_BASE_URL=https://api.yourdomain.com`
   for Production and Preview.
4. Deploy. `frontend/vercel.json` rewrites client-side routes to `index.html`.
5. Back on the VPS, add the Vercel domain to `CORS_ALLOWED_ORIGINS` (and the
   preview regex to `CORS_ALLOWED_ORIGIN_REGEXES`) in `/srv/maat/backend/.env`,
   then `sudo systemctl restart maat-api`.

Verify with the browser: the deployed page should show "Backend connected".
If it shows a network/CORS error, the Vercel origin is missing from
`CORS_ALLOWED_ORIGINS`.
