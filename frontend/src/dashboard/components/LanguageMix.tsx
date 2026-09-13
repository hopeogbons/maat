import { LANGUAGE_SHARE } from '../data'
import { SERIES } from '../theme'

/**
 * Six shares of one whole. A bar beside each number is enough here: the list
 * is already its own table, so it needs no chart twin.
 */
export function LanguageMix() {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(17,23,25,0.04),0_8px_24px_-16px_rgba(17,23,25,0.18)]">
      <h2 className="text-[0.95rem] font-bold tracking-tight text-teal-deep">Language mix</h2>
      <p className="mt-0.5 text-xs text-ink-muted">Share of rumours received, by the language they arrived in.</p>
      <ul className="mt-4 flex flex-1 flex-col justify-center gap-3">
        {LANGUAGE_SHARE.map(({ name, share }) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium text-ink">{name}</span>
              <span className="font-semibold text-ink-muted tabular-nums">{share.toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-teal-soft">
              <div
                className="h-full rounded-full"
                style={{ width: `${share}%`, backgroundColor: SERIES[0] }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
