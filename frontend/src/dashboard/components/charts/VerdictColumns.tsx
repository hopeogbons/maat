import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import type { DayRow } from '../../data'
import { Fit } from './Fit'
import { cappedBarWidth } from './useWidth'
import { CHROME, VERDICT, VERDICT_LABEL, VERDICT_ORDER, axisLabelStyle, baseOptions } from '../../theme'

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const full = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })

/**
 * Part-to-whole over time: one column per day, split by verdict. The 2px white
 * stroke is the surface gap between stacked segments, not an outline.
 */
export function VerdictColumns({ rows, height = 300 }: { rows: DayRow[]; height?: number }) {
  return <Fit>{(width) => <Columns rows={rows} height={height} width={width} />}</Fit>
}

function Columns({ rows, height, width }: { rows: DayRow[]; height: number; width: number }) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar', stacked: true },
    colors: VERDICT_ORDER.map((v) => VERDICT[v]),
    plotOptions: {
      bar: {
        // Never thicker than 24px: the leftover slot is deliberate air.
        columnWidth: cappedBarWidth(width - 56, rows.length, 24, rows.length > 40 ? 80 : 58),
        borderRadius: 4,
        borderRadiusApplication: 'end',
      },
    },
    stroke: { show: true, width: 2, colors: [CHROME.surface] },
    xaxis: {
      categories: rows.map((r) => r.date),
      // One label per ~64px, so they never collide on a phone.
      tickAmount: Math.max(2, Math.min(8, Math.floor((width || 640) / 64), rows.length)),
      axisBorder: { color: CHROME.axis },
      axisTicks: { show: false },
      labels: {
        style: axisLabelStyle,
        rotate: 0,
        hideOverlappingLabels: true,
        formatter: (value: string) => (value ? day.format(new Date(`${value}T00:00:00`)) : ''),
      },
      crosshairs: { fill: { type: 'solid', color: CHROME.tealSoft } },
    },
    yaxis: {
      labels: { style: axisLabelStyle, formatter: (v: number) => v.toLocaleString('en-GB') },
    },
    tooltip: {
      ...baseOptions.tooltip,
      shared: true,
      intersect: false,
      x: {
        formatter: (_v, opts) => {
          const { dataPointIndex } = opts as unknown as { dataPointIndex: number }
          return full.format(new Date(`${rows[dataPointIndex].date}T00:00:00`))
        },
      },
    },
  }

  const series = VERDICT_ORDER.map((v) => ({ name: VERDICT_LABEL[v], data: rows.map((r) => r[v]) }))
  return <Chart options={options} series={series} type="bar" width={width} height={height} />
}
