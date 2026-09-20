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

// ---------------------------------------------------------------------------
// The bearer token
// ---------------------------------------------------------------------------
//
// The dashboard is served from Vercel and this API from another domain. Those
// are different sites, so a Django session cookie would need SameSite=None to
// reach the API at all, and Safari blocks third-party cookies whatever that
// attribute says. An Authorization header is not a cookie, so it just works.
//
// It is kept in localStorage so a reload does not sign the person out. That
// does mean JavaScript can read it, which an HttpOnly cookie would have
// prevented; the backend limits the damage by expiring tokens and by replacing
// the old one on every sign-in (see backend/accounts/auth.py).
//
// Every access is wrapped: localStorage throws rather than returning null in
// Safari's private mode and wherever site data is blocked, and an exception
// here would take the whole page down.

const TOKEN_KEY = 'maat.auth.token'
const EXPIRY_KEY = 'maat.auth.expiresAt'

let authToken: string | null = null
let authExpiresAt: number | null = null
let tokenLoaded = false

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Not fatal: the token still works for this tab, it just will not survive
    // a reload. Signing in again is the recovery, and it is cheap.
  }
}

/** The stored token, or null when there is none or it has already expired. */
export function getAuthToken(): string | null {
  if (!tokenLoaded) {
    authToken = readStorage(TOKEN_KEY)
    const stored = readStorage(EXPIRY_KEY)
    authExpiresAt = stored ? Date.parse(stored) : null
    tokenLoaded = true
  }
  // Drop it ourselves rather than spending a round trip discovering it is
  // dead. The backend enforces the same deadline; this only saves the request.
  if (authToken && authExpiresAt !== null && Number.isFinite(authExpiresAt) && Date.now() >= authExpiresAt) {
    clearAuthToken()
  }
  return authToken
}

export function rememberAuthToken(token: string | null | undefined, expiresAt?: string | null): void {
  if (!token) return
  authToken = token
  authExpiresAt = expiresAt ? Date.parse(expiresAt) : null
  tokenLoaded = true
  writeStorage(TOKEN_KEY, token)
  writeStorage(EXPIRY_KEY, expiresAt ?? null)
}

export function clearAuthToken(): void {
  authToken = null
  authExpiresAt = null
  tokenLoaded = true
  writeStorage(TOKEN_KEY, null)
  writeStorage(EXPIRY_KEY, null)
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

  const bearer = getAuthToken()
  if (bearer && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${bearer}`)
  }

  // Still sent for the session-authenticated paths: the Django admin, and the
  // dev server where the Vite proxy makes this same-origin. Token auth ignores
  // it -- CSRF exists because browsers attach cookies by themselves, and they
  // never attach an Authorization header on their own.
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
    // 401 means the token was refused: expired, revoked, or replaced by a
    // sign-in somewhere else. Drop it so the app falls back to signed-out
    // instead of retrying a credential that can never work again.
    if (response.status === 401) clearAuthToken()
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
  /** Returned by /api/auth/login/ only. Stored, then sent on every request. */
  token?: string
  /** ISO 8601. When the token above stops being accepted. */
  expiresAt?: string
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
  // The token is what authenticates every later request; store it first.
  rememberAuthToken(session.token, session.expiresAt)
  // Django rotates the CSRF token on login. Without this, signing out later
  // fails wherever the cookie is not readable from this origin.
  rememberCsrfToken(session.csrfToken)
  return session
}

export async function signOut(): Promise<Session> {
  try {
    const session = await apiFetch<Session>('/api/auth/logout/', { method: 'POST' })
    rememberCsrfToken(session.csrfToken)
    return session
  } finally {
    // Whatever the server said, this browser is done with the token. A failed
    // request here must not leave the person looking signed in; the server
    // revokes its own copy, and an expiry bounds the rest.
    clearAuthToken()
  }
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

export interface GlobalCoverage {
  name: string
  isActive: boolean
  /** Always true. Global coverage cannot be switched off or removed. */
  isPermanent: boolean
  sources: number
  documents: number
}

export interface ConversationThread {
  /** A short handle for one browser. The key itself never leaves the server. */
  visitor: string
  visits: number
  turns: number
  questions: number
  languages: string[]
  verdicts: Record<'verified' | 'unverified' | 'insufficient', number>
  firstSeen: string
  lastActive: string
  conversations: {
    id: string
    language: string
    turns: number
    isClosed: boolean
    startedAt: string
    lastActive: string
  }[]
}

export interface Transcript {
  id: string
  visitor: string
  language: string
  startedAt: string
  lastActive: string
  isClosed: boolean
  turns: {
    id: string
    speaker: 'visitor' | 'maat'
    said: string
    /** True when what is shown is the restatement, not the visitor's own words. */
    isParaphrase: boolean
    /** True when the exact words were dropped because retention ran out. */
    expired: boolean
    intent: string
    isManipulation: boolean
    degraded: boolean
    at: string
  }[]
  claims: { what: string; verdict: string; rumour: string; rumourSlug: string }[]
}

export interface ConversationsPage {
  threads: ConversationThread[]
  page: number
  pages: number
  pageSize: number
  /** Browsers in total, not on this page. */
  total: number
  /** Browsers with more than one visit, in total. */
  returning: number
  /** The search the server actually ran, echoed back. */
  query: string
}

/**
 * One page of threads, grouped by browser, newest activity first.
 *
 * Paged on the server rather than in the browser: a thread is built by
 * grouping conversations, so slicing the rows here would split a browser
 * across two pages and count it twice.
 */
export function getConversations(page = 0, query = '', pageSize?: number): Promise<ConversationsPage> {
  const params = new URLSearchParams({ page: String(page) })
  if (query) params.set('q', query)
  // The server keeps an allowlist and ignores anything else, so the page size
  // can follow the viewport without the endpoint trusting the caller.
  if (pageSize) params.set('pageSize', String(pageSize))
  return apiFetch<ConversationsPage>(`/api/chat/conversations/?${params}`)
}

/** One conversation, message by message. */
export function getTranscript(id: string): Promise<Transcript> {
  return apiFetch<Transcript>(`/api/chat/conversations/${id}/`)
}

export interface RefreshResult {
  source: SourceOption
  run: { status: string; seen: number; added: number; passages: number; error: string }
}

/**
 * Pull from one source now, ignoring its cadence.
 *
 * The request is held until the pull finishes, because the answer is what it
 * fetched. A slow publisher makes for a slow button, which is the truth of
 * what was asked for.
 */
export function refreshSource(slug: string): Promise<RefreshResult> {
  return apiFetch<RefreshResult>(`/api/documents/sources/${encodeURIComponent(slug)}/refresh/`, {
    method: 'POST',
  })
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
  /** Coverage of everywhere, which is permanent and heads the list. */
  global: GlobalCoverage
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
