/**
 * Single place the frontend talks to the Django backend.
 *
 * - Development: VITE_API_BASE_URL is empty, so requests go to /api/... on the
 *   Vite dev server, which proxies them to Django (see vite.config.ts).
 * - Production (Vercel): VITE_API_BASE_URL is the VPS origin, e.g.
 *   https://api.example.com, so requests go straight to Django.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}

/**
 * Absolute URL of a page Django renders itself (sign in, sign out, admin).
 * Always points at Django's own origin, so its forms and static files work
 * without going through the dev proxy.
 */
export function backendPageUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${import.meta.env.VITE_BACKEND_ORIGIN}${normalized}`
}

export const SIGN_IN_URL = backendPageUrl('/accounts/login/')

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    // Send cookies when the backend uses session auth. Harmless otherwise.
    credentials: 'include',
  })

  const text = await response.text()
  const body: unknown = text ? safeJsonParse(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, body)
  }
  return body as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export interface Health {
  status: 'ok' | 'degraded'
  service: string
  database: string
  time: string
}

export function getHealth(): Promise<Health> {
  return apiFetch<Health>('/api/health/')
}
