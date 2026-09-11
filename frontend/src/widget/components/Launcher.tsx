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
        'maat:fixed maat:right-5 maat:bottom-5 maat:z-[2147483001] maat:inline-flex maat:size-14 maat:items-center maat:justify-center maat:rounded-full maat:bg-primary maat:text-gold maat:shadow-[0_12px_32px_-8px_oklch(0.29_0.055_210/0.65)] maat:ring-1 maat:ring-white/15 maat:transition-transform maat:duration-200 maat:hover:scale-105 maat:active:scale-95 maat:focus-visible:outline-none maat:focus-visible:ring-3 maat:focus-visible:ring-gold/60 maat:motion-reduce:transition-none',
        hideOnMobile && 'maat:hidden maat:sm:inline-flex',
        hidden && 'maat:sm:hidden',
      )}
    >
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
