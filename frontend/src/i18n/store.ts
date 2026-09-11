import { useSyncExternalStore } from 'react'
import { DEFAULT_LANGUAGE, getLanguageMeta, isAvailable, LANGUAGES, type AvailableLanguageCode } from './languages'
import { MESSAGES } from './locales'
import type { Messages } from './messages'

const STORAGE_KEY = 'maat:language'

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
  const code = useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE)
  return { code, language: getLanguageMeta(code), t: MESSAGES[code], setLanguage }
}
