import { cn } from 'cn'
import { Feather } from 'lucide-react'

interface BrandProps {
  /** `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark'
  size?: 'sm' | 'lg'
  className?: string
}

/** The Maat wordmark: a feather on gold, after the goddess who weighs truth. */
export function Brand({ tone = 'light', size = 'sm', className }: BrandProps) {
  const large = size === 'lg'
  return (
    <a href="#top" className={cn('inline-flex items-center gap-2.5', className)} aria-label="Maat, back to top">
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full bg-gold text-gold-dark shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]',
          large ? 'size-12' : 'size-9',
        )}
      >
        <Feather className={large ? 'size-6' : 'size-[18px]'} strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          'font-extrabold tracking-tight',
          large ? 'text-3xl' : 'text-xl',
          tone === 'light' ? 'text-white' : 'text-teal-deep',
        )}
      >
        Maat
      </span>
    </a>
  )
}
