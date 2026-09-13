import { Menu, Settings2 } from 'lucide-react'

/** The section name with its unread count and settings, exactly as the reference sets them. */
export function PageHeading({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <button
        type="button"
        aria-label="Open the menu"
        onClick={onMenu}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-teal-deep lg:hidden"
      >
        <Menu className="size-4" />
      </button>
      <h1 className="mr-auto min-w-0 truncate font-serif text-[1.75rem] leading-none font-bold tracking-tight text-teal-deep sm:text-[2.25rem] lg:text-[2.75rem]">
        {title}
      </h1>
      <button
        type="button"
        aria-label="1 notification"
        className="inline-flex size-9 items-center justify-center rounded-full text-[11px] font-bold text-gold-dark sm:size-6"
      >
        1
      </button>
      <button
        type="button"
        aria-label="Dashboard settings"
        className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft transition hover:text-teal-deep sm:size-6"
      >
        <Settings2 className="size-5" strokeWidth={1.75} />
      </button>
    </div>
  )
}
