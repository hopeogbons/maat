import { cn } from 'cn'
import { Feather } from 'lucide-react'
import { useState } from 'react'

/** What a mark needs to know about its publisher. A SourceRow has all of it; a document carries a copy. */
export interface Marked {
  name: string
  short: string
  logoUrl: string
  brand: string
  isDefault?: boolean
}

/**
 * A publisher's mark: its logo when one is configured and loads, otherwise a
 * monogram in its own colour. Ma'at itself is the feather. Used on the source
 * register and beside every document, so the same body looks the same
 * everywhere it appears.
 */
export function SourceMark({ source, size }: { source: Marked; size: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const box = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-8 rounded-lg' : 'size-12'

  if (source.isDefault) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-2xl bg-gold text-gold-dark shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]',
          box,
        )}
      >
        <Feather className={size === 'lg' ? 'size-8' : size === 'sm' ? 'size-4' : 'size-6'} strokeWidth={2.25} />
      </span>
    )
  }

  if (source.logoUrl && !failed) {
    return (
      <img
        src={source.logoUrl}
        alt=""
        onError={() => setFailed(true)}
        // No ring, no padding, no tile. The mark is the identifier; a box
        // around it makes every publisher look like the same publisher.
        className={cn('shrink-0 object-contain', box)}
      />
    )
  }

  // Their own colour, on white. Institutional logos are trademarks and their
  // favicons are a lottery: several of these bodies answer 403, and two serve
  // a placeholder. A monogram always renders, at one size, and still tells the
  // bodies apart at a glance.
  return (
    <span
      aria-hidden="true"
      style={{ color: source.brand, boxShadow: `inset 0 0 0 1.5px ${source.brand}33` }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-2xl bg-white font-bold tracking-tight',
        box,
        size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-[9px]' : 'text-[13px]',
      )}
    >
      {source.short}
    </span>
  )
}
