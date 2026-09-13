import { cn } from 'cn'
import { MessageSquareText, X } from 'lucide-react'
import type { Ref } from 'react'
import { useLanguage } from '@/i18n'

interface LauncherProps {
  open: boolean
  panelId: string
  /** On phones the panel is full screen and covers the launcher; hide it then. */
  hideOnMobile: boolean
  /** Hide everywhere, e.g. while the panel is maximised on desktop. */
  hidden: boolean
  onClick: () => void
  ref?: Ref<HTMLButtonElement>
}

export function Launcher({ open, panelId, hideOnMobile, hidden, onClick, ref }: LauncherProps) {
  const { t } = useLanguage()
  const iconBase =
    'maat:absolute maat:inset-0 maat:size-6 maat:transition-all maat:duration-200 maat:ease-out maat:motion-reduce:transition-none'

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? t.widget.close : t.widget.open}
      onClick={onClick}
      className={cn(
        'maat:fixed maat:right-5 maat:bottom-5 maat:z-[2147483001] maat:inline-flex maat:size-14 maat:items-center maat:justify-center maat:rounded-full maat:bg-[radial-gradient(120%_120%_at_50%_0%,oklch(0.44_0.07_205),var(--primary)_70%)] maat:text-gold maat:ring-2 maat:ring-gold/70',
        // Bevel (inset highlight above, shadow below) plus a gold halo and glow
        // so the button reads as a raised control on any background.
        'maat:shadow-[inset_0_1.5px_0_oklch(1_0_0/0.35),inset_0_-2px_6px_oklch(0_0_0/0.35),0_10px_28px_-8px_oklch(0.29_0.055_210/0.8),0_0_0_5px_oklch(0.77_0.13_85/0.16),0_0_26px_2px_oklch(0.77_0.13_85/0.35)]',
        'maat:hover:shadow-[inset_0_1.5px_0_oklch(1_0_0/0.45),inset_0_-2px_6px_oklch(0_0_0/0.3),0_14px_32px_-8px_oklch(0.29_0.055_210/0.85),0_0_0_7px_oklch(0.77_0.13_85/0.22),0_0_34px_4px_oklch(0.77_0.13_85/0.5)]',
        'maat:transition-all maat:duration-200 maat:hover:scale-105 maat:active:scale-95 maat:focus-visible:outline-none maat:focus-visible:ring-4 maat:focus-visible:ring-gold maat:motion-reduce:transition-none',
        hideOnMobile && 'maat:hidden maat:sm:inline-flex',
        hidden && 'maat:sm:hidden',
      )}
    >
      {!open && (
        <span
          aria-hidden="true"
          className="maat:pointer-events-none maat:absolute maat:inset-0 maat:-z-10 maat:rounded-full maat:bg-gold/30 maat:animate-halo maat:motion-reduce:animate-none"
        />
      )}
      <span className="maat:relative maat:size-6" aria-hidden="true">
        <MessageSquareText
          className={cn(
            iconBase,
            open ? 'maat:scale-50 maat:rotate-45 maat:opacity-0' : 'maat:scale-100 maat:rotate-0 maat:opacity-100',
          )}
        />
        <X
          className={cn(
            iconBase,
            open ? 'maat:scale-100 maat:rotate-0 maat:opacity-100' : 'maat:scale-50 maat:-rotate-45 maat:opacity-0',
          )}
        />
      </span>
    </button>
  )
}
