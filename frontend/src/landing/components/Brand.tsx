import { cn } from 'cn'
import { Feather } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSession } from '@/auth'

interface BrandProps {
  /** `light` for dark backgrounds, `dark` for light backgrounds. */
  tone?: 'light' | 'dark'
  size?: 'sm' | 'lg'
  className?: string
}

/** The Ma’at wordmark: a feather on gold, after the goddess who weighs truth. */
export function Brand({ tone = 'light', size = 'sm', className }: BrandProps) {
  const large = size === 'lg'
  const session = useSession()
  // Signed in, the mark is the way back to your own work. Signed out, it is
  // the way back to the top of the page.
  const signedIn = session.status === 'signedIn'
  const shell = cn('inline-flex items-center gap-2.5', className)
  const label = signedIn ? 'Ma’at, go to the dashboard' : 'Ma’at, back to top'

  const inside = (
    <>
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
        Ma’at
      </span>
    </>
  )

  if (signedIn) {
    return (
      <Link to="/dashboard" className={shell} aria-label={label}>
        {inside}
      </Link>
    )
  }
  return (
    <a href="#top" className={shell} aria-label={label}>
      {inside}
    </a>
  )
}
