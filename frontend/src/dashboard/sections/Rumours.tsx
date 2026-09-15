import { daysFor, totalBy, total, type RangeKey } from '../data'
import { VERDICT, VERDICT_LABEL, VERDICT_ORDER, percent } from '../theme'
import { ChartCard, DataTable } from '../components/ChartCard'
import { LatestTable } from '../components/LatestTable'
import { Legend } from '../components/Legend'
import { VerdictColumns } from '../components/charts/VerdictColumns'
import { VerdictDonut } from '../components/charts/VerdictDonut'

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export function Rumours({ range }: { range: RangeKey }) {
  const rows = daysFor(range)
  const weighed = total(rows)
  const counts = VERDICT_ORDER.map((v) => totalBy(rows, v))
  const legend = VERDICT_ORDER.map((v) => ({ label: VERDICT_LABEL[v], color: VERDICT[v] }))

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Verdicts each day"
          subtitle="Every rumour weighed, split by what the record said."
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
                percent((counts[i] / weighed) * 100),
              ])}
            />
          }
        >
          <VerdictDonut counts={counts} height={300} />
        </ChartCard>
      </div>

      <LatestTable />
    </div>
  )
}
