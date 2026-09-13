import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { Fit } from './Fit'
import { HOUR_BUCKETS } from '../../data'
import { CHROME, TEAL_RAMP, axisLabelStyle, baseOptions } from '../../theme'

/**
 * Magnitude across a grid, so colour is sequential: one hue, light to dark,
 * where the palest step means "almost nothing arrived".
 */
export function ArrivalHeatmap({
  rows,
  height = 300,
}: {
  rows: { day: string; values: number[] }[]
  height?: number
}) {
  const max = Math.max(...rows.flatMap((r) => r.values))
  const step = max / TEAL_RAMP.length
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'heatmap' },
    stroke: { width: 2, colors: [CHROME.surface] },
    plotOptions: {
      heatmap: {
        radius: 4,
        enableShades: false,
        colorScale: {
          ranges: TEAL_RAMP.map((color, i) => ({
            from: i === 0 ? 0 : Math.round(step * i) + 1,
            to: Math.round(step * (i + 1)),
            color,
          })),
        },
      },
    },
    xaxis: {
      categories: HOUR_BUCKETS,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: axisLabelStyle },
      tooltip: { enabled: false },
    },
    yaxis: { labels: { style: axisLabelStyle } },
    grid: { ...baseOptions.grid, yaxis: { lines: { show: false } }, padding: { left: 4, right: 8 } },
    tooltip: {
      ...baseOptions.tooltip,
      y: { formatter: (v: number) => `${v.toLocaleString('en-GB')} rumours` },
    },
  }
  // Apex draws the first series at the bottom, so reverse to read Mon at the top.
  const series = [...rows]
    .reverse()
    .map((r) => ({ name: r.day, data: r.values.map((v, i) => ({ x: HOUR_BUCKETS[i], y: v })) }))
  return <Fit>{(w) => <Chart options={options} series={series} type="heatmap" width={w} height={height} />}</Fit>
}
