import { ArrowRight } from 'lucide-react'
import { VERDICT, VERDICT_LABEL, VERDICT_ORDER } from '../theme'
import { VerdictRings } from './charts/VerdictRings'

/**
 * The digest card: what this period's verdicts add up to, how many became
 * public articles, and the one action to take. Every number is the server's.
 */
export function PromoCard({ counts, published }: { counts: number[]; published: number }) {
  const weighed = counts.reduce((a, b) => a + b, 0)
  return (
    <aside className="flex min-h-[11.5rem] items-center justify-between gap-3 overflow-hidden rounded-[1.5rem] bg-cream py-4 pr-3 pl-7">
      <div className="min-w-0">
        <p className="font-serif text-[1.45rem] leading-[1.15] font-bold tracking-tight text-teal-deep">
          <span className="text-[#c68102]">Publish</span> this week’s digest
        </p>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          {weighed.toLocaleString('en-GB')} {weighed === 1 ? 'rumour' : 'rumours'} weighed,{' '}
          {published.toLocaleString('en-GB')} published as {published === 1 ? 'an article' : 'articles'}.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-ink-muted">
          {VERDICT_ORDER.map((v, i) => (
            <li key={v} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: VERDICT[v] }}
              />
              {counts[i].toLocaleString('en-GB')} {VERDICT_LABEL[v].toLowerCase()}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative -my-3 shrink-0">
        <VerdictRings counts={counts} size={168} />
        <button
          type="button"
          className="absolute top-1/2 left-1/2 inline-flex size-[3.75rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-teal-deep text-[11px] font-bold tracking-[0.08em] text-white uppercase shadow-[0_14px_28px_-16px_rgba(0,50,57,0.9)] transition hover:bg-teal"
        >
          Send
          <ArrowRight className="mt-0.5 size-3 text-gold" />
        </button>
      </div>
    </aside>
  )
}
