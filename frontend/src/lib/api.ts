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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

/** Django's CSRF cookie, when the API shares a site with the page. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  for (const part of document.cookie.split('; ')) {
    const [key, ...rest] = part.split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

/** Handed to us by /api/auth/session/, for when the cookie is not readable here. */
let csrfToken: string | null = null

export function rememberCsrfToken(token: string | null | undefined): void {
  if (token) csrfToken = token
}

/** The headers every request to Django carries, for callers that fetch on their own. */
export function requestHeaders(init: RequestInit = {}): Headers {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  // FormData must set its own content type, because the boundary is part of
  // it and only the browser knows what it chose. Stamping application/json
  // here makes a multipart body unparseable at the far end.
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (init.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const method = (init.method ?? 'GET').toUpperCase()
  if (!SAFE_METHODS.has(method) && !headers.has('X-CSRFToken')) {
    const token = readCookie('csrftoken') ?? csrfToken
    if (token) headers.set('X-CSRFToken', token)
  }
  return headers
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = requestHeaders(init)

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

export interface Session {
  authenticated: boolean
  username?: string
  /** What the person calls themselves. Empty until they fill in a profile. */
  name?: string
  /** Their own job title, or the role they hold when they have not set one. */
  title?: string
  avatarUrl?: string
  isStaff?: boolean
  isSuperuser?: boolean
  csrfToken?: string
}

/** The fields a person may change about themselves. */
export interface ProfileFields {
  first_name: string
  last_name: string
  job_title: string
  phone: string
  avatar_url: string
  country: string | null
  timezone: string | null
}

export interface ProfilePayload extends Session {
  profile: ProfileFields
  email: string
}

export interface Reference {
  countries: { id: string; name: string; iso2: string; flag: string }[]
  timezones: { id: string; name: string }[]
}

/** Who is signed in. Also primes the CSRF token needed to sign in or out. */
export async function getSession(): Promise<Session> {
  const session = await apiFetch<Session>('/api/auth/session/')
  rememberCsrfToken(session.csrfToken)
  return session
}

export async function signIn(username: string, password: string): Promise<Session> {
  const session = await apiFetch<Session>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  // Django rotates the CSRF token on login. Without this, signing out later
  // fails wherever the cookie is not readable from this origin.
  rememberCsrfToken(session.csrfToken)
  return session
}

export async function signOut(): Promise<Session> {
  const session = await apiFetch<Session>('/api/auth/logout/', { method: 'POST' })
  rememberCsrfToken(session.csrfToken)
  return session
}

export function getProfile(): Promise<ProfilePayload> {
  return apiFetch<ProfilePayload>('/api/auth/profile/')
}

export function saveProfile(fields: Partial<ProfileFields>): Promise<ProfilePayload> {
  return apiFetch<ProfilePayload>('/api/auth/profile/', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

let reference: Promise<Reference> | null = null

/** Countries and time zones. Fetched once: the catalogue changes once a year. */
export function getReference(): Promise<Reference> {
  reference ??= apiFetch<Reference>('/api/reference/').catch((error) => {
    reference = null
    throw error
  })
  return reference
}


export interface DocumentRecord {
  id: string
  title: string
  filename: string
  source: string
  /** The publisher's mark: short name and colour for a monogram, logo when it has one. */
  sourceShort: string
  sourceLogo: string
  sourceBrand: string
  country: string
  publishedAt: string
  version: number
  chunks: number
  bytes: number
  isPublic: boolean
  status: 'ready' | 'ingesting' | 'failed'
}

export interface SourceOption {
  id: string
  slug: string
  name: string
  short: string
  door: 'upload' | 'feed' | 'api' | 'pages'
  address: string
  collection: string
  subject: string
  scope: 'general' | 'by-country' | 'national'
  verification: 'tested' | 'documented' | 'listed'
  logoUrl: string
  brand: string
  country: string
  cadenceMinutes: number
  isActive: boolean
  lastPolledAt: string
  documents: number
  health: 'ok' | 'never' | 'failing' | 'paused'
  lastError: string
  /** How the door is read: paths for an API, listing and include rules for pages, `lookup` for an API asked on demand. */
  schema?: Record<string, unknown>
}

export function getDocuments(): Promise<{ documents: DocumentRecord[] }> {
  return apiFetch<{ documents: DocumentRecord[] }>('/api/documents/')
}

export function getDocumentSources(): Promise<{ sources: SourceOption[] }> {
  return apiFetch<{ sources: SourceOption[] }>('/api/documents/sources/')
}

/** The register, with every figure counted by the database. */
export function getSources(): Promise<{ sources: SourceOption[] }> {
  return apiFetch<{ sources: SourceOption[] }>('/api/documents/sources/')
}

/**
 * Upload one document. Multipart, so no JSON content type: the browser has to
 * set its own boundary and overriding it makes the body unparseable.
 *
 * The server reads the file before answering, so this resolves once the
 * document is genuinely stored and its passages written, not when the bytes
 * finish arriving.
 */
export async function uploadDocument(
  file: File,
  options: { source: string; country: string; isPublic: boolean },
): Promise<DocumentRecord> {
  const body = new FormData()
  body.append('file', file)
  body.append('source', options.source)
  body.append('country', options.country)
  body.append('isPublic', options.isPublic ? 'true' : 'false')
  return apiFetch<DocumentRecord>('/api/documents/', { method: 'POST', body })
}


export interface CoveredCountry {
  id: string
  iso2: string
  name: string
  flag: string
  isActive: boolean
  note: string
}

export interface AppSettings {
  confidence_gate: number
  mentions_before_publish: number
  max_followup_questions: number
  questions_per_visitor_per_hour: number
  daily_question_cap: number
  raw_text_retention_days: number
}

export interface SettingsPayload {
  settings: AppSettings
  countries: CoveredCountry[]
}

export function getSettings(): Promise<SettingsPayload> {
  return apiFetch<SettingsPayload>('/api/settings/')
}

export function saveSettings(patch: Partial<AppSettings>): Promise<SettingsPayload> {
  return apiFetch<SettingsPayload>('/api/settings/', { method: 'PATCH', body: JSON.stringify(patch) })
}

export function coverCountry(iso2: string): Promise<SettingsPayload> {
  return apiFetch<SettingsPayload>('/api/settings/countries/', {
    method: 'POST',
    body: JSON.stringify({ iso2 }),
  })
}

export function setCountryActive(iso2: string, isActive: boolean): Promise<SettingsPayload> {
  return apiFetch<SettingsPayload>(`/api/settings/countries/${iso2}/`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  })
}

export function dropCountry(iso2: string): Promise<SettingsPayload> {
  return apiFetch<SettingsPayload>(`/api/settings/countries/${iso2}/`, { method: 'DELETE' })
}

/** One source's standing on the front page: how much of what Ma'at can cite it holds. */
export interface TopSource {
  id: string
  name: string
  short: string
  logoUrl: string
  brand: string
  country: string
  documents: number
  share: number
}

/** The front page, counted from the record for the last `days` days and the period before. */
export interface DashboardStats {
  days: number
  weighed: number
  weighedBefore: number
  cited: number
  citedBefore: number
  documents: number
  documentsBefore: number
  /** Verified, unverified, insufficient, in that order. */
  verdicts: number[]
  published: number
  activity: { date: string; verified: number; unverified: number; insufficient: number }[]
  topSources: TopSource[]
  latest: LatestRumour[]
  /** How rumours reach Ma'at. Only the widget exists, and it is counted. */
  channels: { messages: number }
}

export interface LatestRumour {
  id: string
  statement: string
  verdict: 'verified' | 'unverified' | 'insufficient'
  confidence: number
  mentions: number
  reporters: number
  status: 'collecting' | 'published' | 'withheld'
  country: string
  lastSeen: string
  source: string
}

export function getDashboard(days: number): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(`/api/dashboard/?days=${days}`)
}


/** The Telegram bot's standing, as the settings page shows it. The token is never returned. */
export interface TelegramStatus {
  connected: boolean
  username: string
  webhookUrl: string
  connectedAt: string
  lastError: string
  messages: number
  lastUpdateAt: string
  /** The server already holds a token in its environment; connecting needs no paste. */
  hasEnvToken: boolean
}

export function getTelegram(): Promise<TelegramStatus> {
  return apiFetch<TelegramStatus>('/api/telegram/')
}

/** Connect the bot with the token BotFather gave. Verified with Telegram before it is kept. */
export function connectTelegram(token: string): Promise<TelegramStatus> {
  return apiFetch<TelegramStatus>('/api/telegram/', { method: 'PUT', body: JSON.stringify({ token }) })
}

export function disconnectTelegram(): Promise<TelegramStatus> {
  return apiFetch<TelegramStatus>('/api/telegram/', { method: 'DELETE' })
}
