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
└── frontend/     Vite + React + TypeScript + Tailwind v4 + shadcn/ui, deployed to Vercel
    ├── src/lib/api.ts   fetch wrapper for the Django API
    └── src/widget/      the Maat chat widget (self-contained, see below)
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

Open http://localhost:5173. You get a demo host page with the Maat widget in
the bottom-right corner (add `?open` to the URL to start with it open). In
development the Vite dev server proxies `/api/*` to Django, so no CORS
configuration is needed.

Useful commands:

```bash
cd backend && .venv/bin/python manage.py test          # backend tests (needs CREATEDB on the role)
cd frontend && npm run build                          # type-check + production build
```

## The Maat widget

`frontend/src/widget/` is a floating chat widget for the rumour-verification
assistant. A circular launcher in the bottom-right corner toggles a panel that
is 380px wide on desktop and full screen on phones.

- **Welcome view**: the Maat mark, "Send a rumour, get a cited answer", a
  legend of the three verdicts and a button into the conversation.
- **Conversation view**: header with back arrow, a message list pinned to the
  newest message, and an input bar with send and voice-note upload.
- **Reply cards** show the verdict, the answer, the cited source with issuing
  body and date, and a link to the original document. When no verified source
  exists the card shows an explicit abstention instead of a citation.
- **Palette**: deep teal with a warm gold accent on the shadcn "neutral" base.
  Verdicts use muted green (verified), amber (unverified) and grey
  (insufficient evidence). Nothing is red, including shadcn's `destructive`.

### Plugging in the real backend

The widget talks to a `MaatClient` (see `src/widget/types.ts`):

```ts
interface MaatClient {
  verifyText(text: string, options?: { signal?: AbortSignal }): Promise<VerifyResult>
  verifyVoice(file: File, options?: { signal?: AbortSignal }): Promise<VerifyResult>
}
```

Without a client it uses `createMockClient()`, which rotates through the three
verdicts with sample sources. Implement the interface on top of
`src/lib/api.ts` and pass it in: `<MaatWidget client={apiClient} />`.

### Style isolation

The widget is meant to drop onto any page without touching it:

- Tailwind utilities are prefixed (`maat:flex`) and generated only from files
  under `src/widget/`, and they are emitted with `!important` so unlayered host
  CSS cannot override them.
- Tailwind's preflight is not imported. A scoped reset under `.maat-root`
  replaces it, so no element selectors reach the host page.
- All colour, radius and font tokens live on `.maat-root`, not on `:root`.
- The root pins its own font, size, colour and text properties, so nothing
  inherited from the host changes how the widget looks.

Only the theme variables Tailwind itself emits (`--maat-*` on `:root`) and its
`@property` registrations are global, and both are namespaced.

Adding more shadcn components: `npx shadcn@latest add <name>` puts them in
`src/widget/ui/` with the prefix already applied (see `components.json`).

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
