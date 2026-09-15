// Kept for reference: the four charts that used to stand in for the Sources
// page. They are analytics, so their home is the dashboard rather than the
// source register. Not routed anywhere at present.
import { HOUR_BUCKETS, arrivals, channelSeries, channelWeekLabels, issuers, type RangeKey } from '../data'
import { SERIES } from '../theme'
import { ChartCard, DataTable } from '../components/ChartCard'
import { LanguageMix } from '../components/LanguageMix'
import { Legend } from '../components/Legend'
import { ArrivalHeatmap } from '../components/charts/ArrivalHeatmap'
import { ChannelLines } from '../components/charts/ChannelLines'
import { IssuerBars } from '../components/charts/IssuerBars'

export function SourceActivity({ range }: { range: RangeKey }) {
  const bodies = issuers(range)
  const cells = arrivals(range)
  const channels = channelSeries(range)
  const weeks = channelWeekLabels(range)

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Most cited issuing bodies"
          subtitle="Documents Ma’at linked to as the source of an answer."
          table={
            <DataTable
              head={['Issuing body', 'Citations']}
              rows={bodies.map((b) => [b.name, b.citations.toLocaleString('en-GB')])}
            />
          }
        >
          <IssuerBars data={bodies} />
        </ChartCard>

        <ChartCard
          title="Where rumours arrive"
          subtitle="Rumours received each week, by channel."
          legend={<Legend items={channels.map((c, i) => ({ label: c.name, color: SERIES[i] }))} />}
          table={
            <DataTable
              head={['Week', ...channels.map((c) => c.name)]}
              rows={weeks.map((w, i) => [w, ...channels.map((c) => c.data[i].toLocaleString('en-GB'))])}
            />
          }
        >
          <ChannelLines series={channels} categories={weeks} />
        </ChartCard>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="When rumours arrive"
          subtitle="Rumours received by day of the week and time of day."
          legend={
            <div className="flex items-center gap-2 text-[11px] font-medium text-ink-muted">
              <span>Fewer</span>
              <span aria-hidden="true" className="flex overflow-hidden rounded-full">
                {['#e3f6f7', '#a3dde0', '#40b1b7', '#007e84', '#026266'].map((c) => (
                  <span key={c} className="size-3" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span>More</span>
            </div>
          }
          table={
            <DataTable
              head={['Day', ...HOUR_BUCKETS]}
              rows={cells.map((r) => [r.day, ...r.values.map((v) => v.toLocaleString('en-GB'))])}
            />
          }
        >
          <ArrivalHeatmap rows={cells} />
        </ChartCard>

        <LanguageMix />
      </div>
    </div>
  )
}
