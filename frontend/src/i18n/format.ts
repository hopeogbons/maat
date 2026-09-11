import { getLanguageMeta, type LanguageCode } from './languages'

const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(code: LanguageCode, style: 'long' | 'short'): Intl.DateTimeFormat {
  const key = `${code}:${style}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(getLanguageMeta(code).intlLocale, {
      day: 'numeric',
      month: style,
      year: 'numeric',
    })
    cache.set(key, f)
  }
  return f
}

/** Formats an ISO date (YYYY-MM-DD) in the given language; falls back to the raw string. */
export function formatDate(iso: string, code: LanguageCode, style: 'long' | 'short' = 'long'): string {
  const parsed = new Date(`${iso}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? iso : formatter(code, style).format(parsed)
}
