import { cn } from 'cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Page numbers with the current page always in the middle where there is room,
 * and an ellipsis standing in for the stretch nobody needs to see. Returns the
 * literal page indices to draw, with -1 meaning a gap.
 */
function windowed(current: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i)
  const out = new Set<number>([0, pages - 1, current])
  for (const n of [current - 1, current + 1]) {
    if (n > 0 && n < pages - 1) out.add(n)
  }
  const sorted = [...out].sort((a, b) => a - b)
  const withGaps: number[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) withGaps.push(-1)
    withGaps.push(n)
  })
  return withGaps
}

/**
 * One pager for every list in the dashboard. Shows what is on screen out of
 * how many, because "page 2 of 5" alone never answers the question somebody
 * actually has, which is whether the thing they are looking for is behind them
 * or ahead.
 */
export function Pager({
  current,
  onPage,
  pages,
  showing,
  total,
  unit,
}: {
  current: number
  onPage: (page: number) => void
  pages: number
  /** How many rows are on screen right now. */
  showing: { from: number; to: number }
  total: number
  unit: string
}) {
  if (pages <= 1) return null

  return (
    <nav
      aria-label={`${unit} pages`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-3"
    >
      <p className="text-xs text-ink-muted">
        Showing <span className="font-medium text-ink">{showing.from}</span>–
        <span className="font-medium text-ink">{showing.to}</span> of{' '}
        <span className="font-medium text-ink">{total}</span> {unit}
      </p>

      <div className="flex items-center gap-1.5">
        <Step label="Previous page" disabled={current === 0} onClick={() => onPage(current - 1)}>
          <ChevronLeft className="size-4" />
        </Step>

        {windowed(current, pages).map((n, i) =>
          n === -1 ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm text-ink-muted">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-label={`Page ${n + 1}`}
              aria-current={n === current ? 'page' : undefined}
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full text-sm font-medium transition',
                n === current
                  ? 'bg-teal-deep text-white shadow-sm'
                  : 'text-ink-muted hover:bg-sand hover:text-teal-deep',
              )}
            >
              {n + 1}
            </button>
          ),
        )}

        <Step label="Next page" disabled={current >= pages - 1} onClick={() => onPage(current + 1)}>
          <ChevronRight className="size-4" />
        </Step>
      </div>
    </nav>
  )
}

function Step({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line text-teal-deep transition hover:border-teal/40 hover:bg-sand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
