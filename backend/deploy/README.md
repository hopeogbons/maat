# Deploying the backend

The backend is deployed by the **vps-deploy-kit** (a sibling project of this
repository), from GitHub, on every push to `main`. Its `apps/maat/` folder
describes this app to the server, and `guides/maat-deploy-guide.md` there is
the runbook. This folder holds only the part of the deploy that belongs with
the code:

```
deploy/hooks/
├── after-install    after pip, before migrate:      playwright install chromium
└── after-migrate    after migrate + collectstatic,  bootstrap_backend.py, seed_sources
                     before the `current` symlink flips
```

`release-maat` on the server runs each executable hook it finds here, with
`/etc/maat.env` loaded, the release as the working directory and `VENV`,
`APP`, `RELEASE`, `ROOT` and `SHARED` exported. A hook that fails before the
flip aborts the release; the live one is untouched. A third hook,
`after-activate`, runs after the services have restarted and is reported but
never rolled back.

What the kit's shared `gunicorn@maat` unit runs is `gunicorn.conf.py` beside
`manage.py`; every knob in it can be overridden from `/etc/maat.env`.

The frontend does not deploy from here: Vercel builds it from the same push
(root directory `frontend`, `VITE_API_BASE_URL` set to the API's origin).

## Trying a hook locally

They only need a virtualenv and the environment the app already has:

```bash
cd backend
VENV=.venv deploy/hooks/after-migrate
```
