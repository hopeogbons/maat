import { cn } from 'cn'
import { useState } from 'react'
import type { SourceMarkInfo } from '../types'

/**
 * Three letters at most from a body's name, for when it has no short form of
 * its own. Four reads as a word somebody is meant to say.
 */
function monogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .filter((w) => w.length > 3 || w === w.toUpperCase())
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * A publisher's mark beside its citation: its logo when one is configured
 * and loads, otherwise a monogram in its own colour on white. The same body
 * looks the same here as on the staff dashboard, so a reader who has seen
 * the mark once knows whose document this is before reading the name.
 */
export function SourceMark({ source, className }: { source: SourceMarkInfo; className?: string }) {
  const [failed, setFailed] = useState(false)
  const box = 'maat:size-9 maat:shrink-0 maat:rounded-lg'

  if (source.logoUrl && !failed) {
    return (
      <img
        src={source.logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className={cn(box, 'maat:bg-white maat:object-contain', className)}
      />
    )
  }

  const brand = source.brand || 'var(--primary)'
  return (
    <span
      aria-hidden="true"
      style={{ color: brand, boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${brand} 20%, transparent)` }}
      className={cn(
        box,
        'maat:inline-flex maat:items-center maat:justify-center maat:bg-white maat:text-[10px] maat:font-bold maat:tracking-tight',
        className,
      )}
    >
      {source.short || monogram(source.name)}
    </span>
  )
}
