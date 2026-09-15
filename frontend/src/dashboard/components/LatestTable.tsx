import { Clock } from 'lucide-react'
import { LATEST } from '../data'
import { VerdictPill } from './VerdictPill'

export function LatestTable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(17,23,25,0.04),0_8px_24px_-16px_rgba(17,23,25,0.18)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[0.95rem] font-bold tracking-tight text-teal-deep">Latest verifications</h2>
          <p className="mt-0.5 text-xs text-ink-muted">The seven most recent answers Ma’at sent.</p>
        </div>
        <a
          href="/rumours"
          className="-my-2 inline-flex min-h-9 items-center px-1 text-xs font-semibold text-teal underline-offset-2 hover:underline"
        >
          View all
        </a>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-line bg-sand/60 text-[11px] tracking-wide text-ink-muted uppercase">
              <th scope="col" className="px-5 py-2.5 font-semibold">Claim</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Verdict</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Cited source</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Language</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Channel</th>
              <th scope="col" className="px-5 py-2.5 text-right font-semibold">To verdict</th>
            </tr>
          </thead>
          <tbody>
            {LATEST.map((row) => (
              <tr key={row.id} className="border-b border-line/70 transition hover:bg-sand/60">
                <td className="max-w-[22rem] px-5 py-3 font-medium text-teal-deep">
                  <span className="line-clamp-1">{row.claim}</span>
                </td>
                <td className="px-5 py-3">
                  <VerdictPill verdict={row.verdict} />
                </td>
                <td className="px-5 py-3 text-ink-muted">
                  {row.issuer ?? <span className="text-ink-soft italic">None found</span>}
                </td>
                <td className="px-5 py-3 text-ink-muted">{row.language}</td>
                <td className="px-5 py-3 text-ink-muted">{row.channel}</td>
                <td className="px-5 py-3 text-right text-ink-muted tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-ink-soft" />
                    {row.minutes.toFixed(1)}m
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
