import { useSyncExternalStore } from 'react'
import { apiFetch } from '@/lib/api'
import {
  COUNTRIES,
  DEFAULT_LANGUAGE,
  getLanguageMeta,
  groupAllLanguages,
  isAvailable,
  LANGUAGES,
  type AvailableLanguageCode,
  type CountryCode,
} from './languages'
import { MESSAGES } from './locales'
import type { Messages } from './messages'

const STORAGE_KEY = 'maat:language'
const COVERAGE_KEY = 'maat:coverage'

const ALL_COUNTRIES: readonly CountryCode[] = COUNTRIES.map((c) => c.code)

/**
 * The countries switched on in Settings. A language is offered only when its
 * country is on, so switching Kenya off takes Kiswahili off the picker and
 * switching it on brings it back; English is shared and always there. The
 * last answer is remembered for the next visit so the picker is right from
 * the first paint, and refreshed from the server on every load.
 */
function readCoverage(): CountryCode[] | null {
  try {
    const raw = window.localStorage.getItem(COVERAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return ALL_COUNTRIES.filter((code) => parsed.includes(code))
  } catch {
    return null
  }
}

let coverage: readonly CountryCode[] = typeof window === 'undefined' ? ALL_COUNTRIES : (readCoverage() ?? ALL_COUNTRIES)

export function getCoverage(): readonly CountryCode[] {
  return coverage
}

/** Whether a language can be chosen: translated, and its country switched on. */
export function isOffered(code: string): code is AvailableLanguageCode {
  if (!isAvailable(code)) return false
  const country = LANGUAGES.find((l) => l.code === code)?.country
  return !country || coverage.includes(country)
}

/** English, then each switched-on country's languages, for the pickers. */
export function groupLanguages() {
  return groupAllLanguages(coverage)
}

export function setCoverage(codes: readonly string[]): void {
  coverage = ALL_COUNTRIES.filter((code) => codes.includes(code))
  try {
    window.localStorage.setItem(COVERAGE_KEY, JSON.stringify(coverage))
  } catch {
    // Storage may be unavailable; the answer still applies for this visit.
  }
  // A language whose country has just gone off is no longer on offer.
  if (!isOffered(current)) setLanguage(DEFAULT_LANGUAGE)
  else for (const listener of listeners) listener()
}

let loading: Promise<void> | null = null

/** Ask the server which countries are on. One request per page load. */
export function loadCoverage(): Promise<void> {
  loading ??= apiFetch<{ countries: { iso2: string }[] }>('/api/coverage/')
    .then((data) => setCoverage(data.countries.map((c) => c.iso2)))
    .catch(() => {
      // Offline or the API is down: the remembered answer stands.
      loading = null
    })
  return loading
}

function readStored(): AvailableLanguageCode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value && isAvailable(value) ? value : null
  } catch {
    return null
  }
}

function detectFromBrowser(): AvailableLanguageCode | null {
  if (typeof navigator === 'undefined') return null
  for (const tag of navigator.languages ?? [navigator.language]) {
    const primary = tag.toLowerCase().split('-')[0]
    const match = LANGUAGES.find((l) => l.available && l.code === primary)
    if (match) return match.code as AvailableLanguageCode
  }
  return null
}

let current: AvailableLanguageCode =
  typeof window === 'undefined' ? DEFAULT_LANGUAGE : (readStored() ?? detectFromBrowser() ?? DEFAULT_LANGUAGE)
if (!isOffered(current)) current = DEFAULT_LANGUAGE

const listeners = new Set<() => void>()

function applyToDocument(code: AvailableLanguageCode) {
  if (typeof document !== 'undefined') document.documentElement.lang = code
}
applyToDocument(current)

export function getLanguage(): AvailableLanguageCode {
  return current
}

export function setLanguage(code: AvailableLanguageCode): void {
  if (code === current) return
  current = code
  try {
    window.localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Storage may be unavailable; the choice still applies for this visit.
  }
  applyToDocument(code)
  for (const listener of listeners) listener()
}

function snapshot(): string {
  return `${current}|${coverage.join(',')}`
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current language, its messages, and a setter. Re-renders on change. */
export function useLanguage(): {
  code: AvailableLanguageCode
  language: ReturnType<typeof getLanguageMeta>
  t: Messages
  setLanguage: typeof setLanguage
} {
  // The snapshot carries the coverage too, so a picker re-renders when a
  // country is switched on or off, not only when the language changes.
  const key = useSyncExternalStore(subscribe, snapshot, () => `${DEFAULT_LANGUAGE}|`)
  const code = key.split('|')[0] as AvailableLanguageCode
  return { code, language: getLanguageMeta(code), t: MESSAGES[code], setLanguage }
}
