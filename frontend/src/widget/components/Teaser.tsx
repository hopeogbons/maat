import { cn } from 'cn'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import { Emblem } from './Emblem'
import { FLOATING_RING, Tail } from './MessageBubble'

const DISMISSED_KEY = 'maat:teaser-dismissed'
const SHOW_AFTER_MS = 1200

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function remember() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Storage may be unavailable; the teaser just returns on the next load.
  }
}

interface TeaserProps {
  /** Hidden whenever the panel is open or opening. */
  hidden: boolean
  onOpen: () => void
}

/**
 * The opening line, spoken from beside the launcher while the panel is closed.
 * A visitor landing for the first time sees Ma’at start the conversation
 * without having to click anything. Dismissing it is remembered for the visit.
 */
export function Teaser({ hidden, onOpen }: TeaserProps) {
  const { t } = useLanguage()
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(wasDismissed)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (hidden || dismissed || !ready) return null

  const dismiss = () => {
    remember()
    setDismissed(true)
  }

  return (
    <div
      role="status"
      className={cn(
        'maat:fixed maat:right-[5.75rem] maat:bottom-5 maat:z-[2147483001] maat:w-[min(17rem,calc(100vw-7.25rem))]',
        'maat:animate-fade-up maat:motion-reduce:animate-none',
      )}
    >
      <div className="maat:relative maat:isolate maat:rounded-2xl maat:bg-card maat:px-3.5 maat:py-3 maat:text-sm maat:text-card-foreground maat:shadow-[0_18px_40px_-14px_oklch(0.29_0.055_210/0.45)] maat:ring-1 maat:ring-foreground/10">
        {/* The tail, aimed at the launcher's centre: half its height above the shared bottom edge. */}
        <Tail side="right" fill="var(--card)" ring={FLOATING_RING} y="1.75rem" />
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.widget.close}
          className="maat:absolute maat:top-1.5 maat:right-1.5 maat:inline-flex maat:size-6 maat:items-center maat:justify-center maat:rounded-full maat:text-muted-foreground maat:hover:bg-muted maat:hover:text-foreground"
        >
          <X className="maat:size-3.5" />
        </button>
        <button type="button" onClick={onOpen} className="maat:block maat:w-full maat:pr-5 maat:text-left">
          <span className="maat:flex maat:items-center maat:gap-2">
            <Emblem size="xs" />
            <span className="maat:font-heading maat:text-xs maat:font-semibold maat:text-primary">Ma’at</span>
          </span>
          <span className="maat:mt-1.5 maat:block maat:leading-snug">{t.widget.tagline}</span>
          <span className="maat:mt-1.5 maat:block maat:text-xs maat:font-medium maat:text-gold-dark">
            {t.widget.start} →
          </span>
        </button>
      </div>
    </div>
  )
}
