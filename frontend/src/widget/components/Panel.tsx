import { cn } from 'cn'
import type { AnimationEvent, ReactNode } from 'react'

interface PanelProps {
  id: string
  state: 'open' | 'closed'
  /** Desktop only: fill the viewport (with a margin) instead of the 380px card. */
  expanded: boolean
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void
  children: ReactNode
}

/**
 * The floating container. Full screen on phones (slides up), a 380px card
 * anchored above the launcher from the `sm` breakpoint (scales in), or a
 * large centred panel when maximised.
 */
export function Panel({ id, state, expanded, onAnimationEnd, children }: PanelProps) {
  return (
    <section
      id={id}
      role="dialog"
      aria-label="Maat rumour verification"
      data-state={state}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onAnimationEnd(event)
      }}
      className={cn(
        'maat:fixed maat:inset-0 maat:z-[2147483000] maat:flex maat:flex-col maat:overflow-hidden maat:bg-background maat:text-foreground',
        'maat:sm:origin-bottom-right maat:sm:rounded-2xl maat:sm:shadow-[0_24px_64px_-16px_oklch(0.29_0.055_210/0.45)] maat:sm:ring-1 maat:sm:ring-black/10',
        expanded
          ? 'maat:sm:inset-4 maat:sm:mx-auto maat:sm:h-auto maat:sm:w-[min(960px,100%)]'
          : 'maat:sm:inset-auto maat:sm:right-5 maat:sm:bottom-22 maat:sm:h-[min(640px,calc(100dvh-7rem))] maat:sm:w-[380px]',
        state === 'open'
          ? 'maat:animate-sheet-in maat:sm:animate-panel-in'
          : 'maat:animate-sheet-out maat:sm:animate-panel-out',
        'maat:motion-reduce:animate-none',
      )}
    >
      {children}
    </section>
  )
}
