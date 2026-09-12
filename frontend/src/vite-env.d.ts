/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute backend origin in production, e.g. https://api.example.com. Empty in dev (Vite proxy). */
  readonly VITE_API_BASE_URL?: string
  /** Django's origin for server-rendered pages such as sign in. Set by vite.config.ts. */
  readonly VITE_BACKEND_ORIGIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
