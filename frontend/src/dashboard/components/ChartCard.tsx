import { cn } from 'cn'
import { ChartColumnBig, Table2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  /** Rendered beside the title: the legend, when the chart draws two or more series. */
  legend?: ReactNode
  /** The WCAG-clean twin. Every chart has one, so no value is reachable only by hover. */
  table: ReactNode
  children: ReactNode
  className?: string
}

export function ChartCard({ title, subtitle, legend, table, children, className }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const bodyId = useId()

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(17,23,25,0.04),0_8px_24px_-16px_rgba(17,23,25,0.18)]',
        className,
      )}
    >
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.95rem] font-bold tracking-tight text-teal-deep">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <div
            role="group"
            aria-label={`${title}: view as`}
            className="inline-flex shrink-0 rounded-lg border border-line bg-sand p-0.5"
          >
          {(
            [
              { key: 'chart', label: 'Chart', Icon: ChartColumnBig },
              { key: 'table', label: 'Table', Icon: Table2 },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              aria-controls={bodyId}
              onClick={() => setView(key)}
              title={`${label} view`}
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-md transition sm:size-7',
                view === key
                  ? 'bg-white text-teal shadow-sm ring-1 ring-line'
                  : 'text-ink-soft hover:text-teal',
              )}
            >
              <Icon className="size-4 sm:size-3.5" />
              <span className="sr-only">{label}</span>
            </button>
          ))}
          </div>
        </div>
        {legend && <div className="mt-3">{legend}</div>}
      </header>
      <div id={bodyId} className="min-w-0 flex-1 px-2 pb-4">
        {view === 'chart' ? children : <div className="px-3 pt-1">{table}</div>}
      </div>
    </section>
  )
}

/** The table twin's shared shell: scrollable, tabular figures, hairline rules. */
export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-sand">
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  'border-b border-line px-3 py-2 font-semibold text-teal-deep',
                  i > 0 && 'text-right',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="even:bg-sand/50">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={cn(
                    'border-b border-line/70 px-3 py-1.5 text-ink-muted',
                    c > 0 && 'text-right tabular-nums',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
