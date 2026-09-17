import { useEffect, useState } from 'react'
import { getDashboard, type DashboardStats, type LatestRumour } from '@/lib/api'
import { RANGES, type RangeKey } from '../data'
import { VERDICT, VERDICT_LABEL, VERDICT_ORDER, percent } from '../theme'
import { ChartCard, DataTable } from '../components/ChartCard'
import { Legend } from '../components/Legend'
import { VerdictPill } from '../components/VerdictPill'
import { VerdictColumns } from '../components/charts/VerdictColumns'
import { VerdictDonut } from '../components/charts/VerdictDonut'

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const EMPTY: DashboardStats = {
  days: 7, weighed: 0, weighedBefore: 0, cited: 0, citedBefore: 0, documents: 0, documentsBefore: 0,
  verdicts: [0, 0, 0], published: 0, activity: [], topSources: [], latest: [], channels: { messages: 0 },
}

const STATUS: Record<LatestRumour['status'], string> = { collecting: 'Collecting', published: 'Published', withheld: 'Withheld' }

/**
 * Every rumour raised, from the record. The charts are the same counts the
 * front page uses, split by day and by verdict; the table is the rumours
 * themselves, newest first, with the body each verdict rests on.
 */
export function Rumours({ range }: { range: RangeKey }) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY)
  const days = RANGES.find((r) => r.key === range)?.days ?? 7

  useEffect(() => {
    let live = true
    getDashboard(days)
      .then((s) => live && setStats(s))
      .catch(() => live && setStats(EMPTY))
    return () => {
      live = false
    }
  }, [days])

  const rows = stats.activity
  const weighed = stats.weighed
  const counts = stats.verdicts
  const legend = VERDICT_ORDER.map((v) => ({ label: VERDICT_LABEL[v], color: VERDICT[v] }))

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Verdicts each day"
          subtitle="Every rumour raised in the period, split by what the record said."
          legend={<Legend items={legend} />}
          table={
            <DataTable
              head={['Day', 'Verified', 'Unverified', 'Insufficient', 'Total']}
              rows={rows
                .slice()
                .reverse()
                .map((r) => [
                  shortDate.format(new Date(`${r.date}T00:00:00`)),
                  r.verified.toLocaleString('en-GB'),
                  r.unverified.toLocaleString('en-GB'),
                  r.insufficient.toLocaleString('en-GB'),
                  (r.verified + r.unverified + r.insufficient).toLocaleString('en-GB'),
                ])}
            />
          }
        >
          <VerdictColumns rows={rows} />
        </ChartCard>

        <ChartCard
          title="Verdict split"
          subtitle="Share of the same period."
          legend={<Legend items={legend} />}
          table={
            <DataTable
              head={['Verdict', 'Rumours', 'Share']}
              rows={VERDICT_ORDER.map((v, i) => [
                VERDICT_LABEL[v],
                counts[i].toLocaleString('en-GB'),
                weighed ? percent((counts[i] / weighed) * 100) : '0%',
              ])}
            />
          }
        >
          <VerdictDonut counts={counts} height={300} />
        </ChartCard>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(17,23,25,0.04),0_8px_24px_-16px_rgba(17,23,25,0.18)]">
        <header className="px-5 pt-5 pb-3">
          <h2 className="text-[0.95rem] font-bold tracking-tight text-teal-deep">Latest rumours</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            The rumours most recently raised, whatever the range above, with the body each verdict rests on.
          </p>
        </header>
        {stats.latest.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-ink-muted">No rumour has been raised yet. The first conversation fills this in.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="text-[11px] tracking-wide text-ink-muted uppercase">
                <tr className="border-y border-line">
                  <th className="px-5 py-2.5 font-medium">Rumour</th>
                  <th className="px-3 py-2.5 font-medium">Verdict</th>
                  <th className="px-3 py-2.5 font-medium">Rests on</th>
                  <th className="px-3 py-2.5 text-right font-medium">Mentions</th>
                  <th className="px-3 py-2.5 text-right font-medium">Reporters</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.latest.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-sand/60">
                    <td className="max-w-[24rem] px-5 py-3 font-medium text-ink">
                      {r.statement}
                      {r.country && <span className="ml-2 text-xs font-normal text-ink-muted">{r.country}</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <VerdictPill verdict={r.verdict} />
                      <span className="ml-1.5 text-xs text-ink-muted tabular-nums">{r.confidence}%</span>
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{r.source || <span className="italic">None found</span>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.mentions}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{r.reporters}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-muted">{STATUS[r.status]}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-ink-muted">{when.format(new Date(r.lastSeen))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
