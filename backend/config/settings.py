"""
Django settings for the maat backend.

Every deploy-specific value comes from environment variables (or a .env file
next to manage.py in local development). See .env.example for the full list.
"""

import os
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env if present, then the repository-level .env beside it, so a
# secret kept at the root (the OpenAI key lives there) is seen too. Real
# environment variables always win over both.
load_dotenv(BASE_DIR / ".env", override=False)
load_dotenv(BASE_DIR.parent / ".env", override=False)


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

SECRET_KEY = os.environ.get("SECRET_KEY", "")
DEBUG = env_bool("DEBUG", False)

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-dev-only-do-not-use-in-production"
    else:
        raise ImproperlyConfigured("SECRET_KEY environment variable is required when DEBUG is off.")

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "localhost,127.0.0.1")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Full-text search fields and GIN indexes for the corpus.
    "django.contrib.postgres",
    # Third party
    "rest_framework",
    "corsheaders",
    # Local
    "core",
    "ai",
    "api",
    "accounts",
    "appsettings",
    "knowledge",
    "verification",
]

MIDDLEWARE = [
    # CORS must run before anything that can produce a response.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise serves collected static files (admin CSS etc.) without nginx config.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # After authentication, so request.user exists: publishes it to model code
    # that has no request in hand (see core.context).
    "core.context.CurrentUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "accounts.context_processors.site",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Database (PostgreSQL only, configured via DATABASE_URL)
# ---------------------------------------------------------------------------

if not os.environ.get("DATABASE_URL"):
    raise ImproperlyConfigured(
        "DATABASE_URL environment variable is required, "
        "e.g. postgres://maat:maat@localhost:5432/maat"
    )

DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        conn_max_age=600,
        conn_health_checks=True,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Uploaded documents. Set explicitly: left unset, Django writes them relative to
# whatever directory the process was started in, which put archived uploads
# straight into the repository root.
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# The hashed manifest needs `collectstatic`, which tests never run (and tests
# force DEBUG off), so the test runner uses plain static storage instead.
RUNNING_TESTS = len(sys.argv) > 1 and sys.argv[1] == "test"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "django.contrib.staticfiles.storage.StaticFilesStorage"
            if RUNNING_TESTS
            else "whitenoise.storage.CompressedManifestStaticFilesStorage"
        )
    },
}

# ---------------------------------------------------------------------------
# Cross-origin access from the React frontend
# ---------------------------------------------------------------------------

# Exact origins, e.g. "https://maat.vercel.app,https://maat.example.com"
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
# Regexes, e.g. r"^https://maat-.*\.vercel\.app$" to allow Vercel preview deploys
CORS_ALLOWED_ORIGIN_REGEXES = env_list("CORS_ALLOWED_ORIGIN_REGEXES")
CORS_ALLOW_CREDENTIALS = True

# Needed for any unsafe request (POST/PUT/DELETE) that uses session/CSRF auth.
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

# ---------------------------------------------------------------------------
# Sign-in pages and the public site
# ---------------------------------------------------------------------------

# Where the React landing page lives; the sign-in pages link back to it.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")

# The front end is our own site: it may call the API with cookies, and its POSTs
# must pass Django's CSRF origin check. Both lists still accept extra entries
# from the environment for preview deploys and other front ends.
if FRONTEND_URL:
    if FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(FRONTEND_URL)
    if FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(FRONTEND_URL)

LOGIN_URL = "/accounts/login/"
LOGIN_REDIRECT_URL = "/accounts/"
# None: show the branded signed-out page (which links to FRONTEND_URL).
LOGOUT_REDIRECT_URL = None

# ---------------------------------------------------------------------------
# Running behind nginx on the VPS
# ---------------------------------------------------------------------------

# nginx terminates TLS and forwards the original scheme in this header.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Lax is right while the site and the API share a domain. When the front end is
# served from another site (Vercel) and the API from the VPS, set both to None
# so the browser still sends the session and CSRF cookies. None needs Secure.
SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.environ.get("CSRF_COOKIE_SAMESITE", "Lax")
# Leave the http->https redirect to nginx by default; enable here if preferred.
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", False)

# ---------------------------------------------------------------------------
# AI provider
# ---------------------------------------------------------------------------

# One inference source: OpenAI, direct. Every model name is resolved through
# ai.provider at call time, so a provider change is one place.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
# The everyday model: reading the visitor, the interview, greetings, contexts.
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
# The careful model: judging evidence against a claim and writing the answer.
OPENAI_ANSWER_MODEL = os.environ.get("OPENAI_ANSWER_MODEL", "gpt-4.1")
OPENAI_RERANK_MODEL = os.environ.get("OPENAI_RERANK_MODEL", OPENAI_MODEL)
OPENAI_EMBEDDING_MODEL = os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
# The ears and the mouth: a voice note transcribed, a reply read aloud.
OPENAI_TRANSCRIBE_MODEL = os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")
OPENAI_SPEECH_MODEL = os.environ.get("OPENAI_SPEECH_MODEL", "gpt-4o-mini-tts")
OPENAI_SPEECH_VOICE = os.environ.get("OPENAI_SPEECH_VOICE", "marin")
# A voice note longer than this is refused before it is transcribed. Sixty
# seconds of Opus is well under a megabyte; the ceiling leaves room for
# browsers that record less thriftily.
VOICE_NOTE_MAX_BYTES = int(os.environ.get("VOICE_NOTE_MAX_BYTES", str(5 * 1024 * 1024)))
# True makes every AI call use its deterministic fallback. Tests run this way,
# and so can a machine with no key: the site must still work without a provider.
AI_OFFLINE = env_bool("AI_OFFLINE", False) or RUNNING_TESTS
# The streamed chat runs the engine on a thread so events can be written as
# they happen. Under test it runs inline: a second connection cannot see the
# test's own transaction.
CHAT_STREAM_INLINE = RUNNING_TESTS

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

# Throttle counters live here. The in-memory default is per gunicorn worker, so
# a real deploy should point REDIS_URL at a shared cache or the sign-in limit is
# multiplied by the number of workers.
REDIS_URL = os.environ.get("REDIS_URL", "")
CACHES = {
    "default": (
        {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
        if REDIS_URL
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "maat"}
    )
}

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Session cookies only. Basic auth would hand out an unthrottled password
    # oracle on every endpoint, and it skips the CSRF check.
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    # How many proxies sit in front of Django. Without this the throttle keys on
    # the whole X-Forwarded-For header, which the caller controls. nginx on the
    # VPS is one hop; running gunicorn directly is none.
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "0")),
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        *(["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    ],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # Only the sign-in endpoint is throttled, and only to blunt password guessing.
    "DEFAULT_THROTTLE_RATES": {"login": os.environ.get("LOGIN_THROTTLE_RATE", "12/min")},
}

# ---------------------------------------------------------------------------
# Logging (to stdout so journald / gunicorn capture it)
# ---------------------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "standard"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

MAILERS = {
    "default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"},
}
