const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Formats an ISO date (YYYY-MM-DD) as "3 September 2026"; falls back to the raw string. */
export function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? iso : dateFormatter.format(parsed)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
