import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { Fit } from './Fit'
import { CHROME, SERIES, axisLabelStyle, baseOptions } from '../../theme'

/**
 * Four series that are the subject, so identity carries the colour. The legend
 * names them, and each line is direct-labelled at its own end.
 */
export function ChannelLines({
  series,
  categories,
  height = 300,
}: {
  series: { name: string; data: number[] }[]
  categories: string[]
  height?: number
}) {
  const last = categories.length - 1
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'line' },
    colors: series.map((_, i) => SERIES[i]),
    stroke: { width: 2, curve: 'smooth', lineCap: 'round' },
    markers: {
      size: 0,
      strokeWidth: 2,
      strokeColors: CHROME.surface,
      hover: { size: 5, sizeOffset: 0 },
    },
    dataLabels: {
      enabled: true,
      // Selective: the series name at the end of its own line, nowhere else.
      formatter: (_value, opts) => {
        const { seriesIndex, dataPointIndex } = opts as unknown as {
          seriesIndex: number
          dataPointIndex: number
        }
        return dataPointIndex === last ? series[seriesIndex].name : ''
      },
      textAnchor: 'start',
      offsetX: 10,
      offsetY: 1,
      background: { enabled: false },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: baseOptions.chart.fontFamily,
        colors: series.map(() => CHROME.inkMuted),
      },
    },
    grid: { ...baseOptions.grid, padding: { top: 0, right: 92, bottom: 0, left: 4 } },
    xaxis: {
      categories,
      axisBorder: { color: CHROME.axis },
      axisTicks: { show: false },
      labels: { style: axisLabelStyle },
      tooltip: { enabled: false },
      crosshairs: { stroke: { color: CHROME.axis, width: 1, dashArray: 0 } },
    },
    yaxis: {
      labels: { style: axisLabelStyle, formatter: (v: number) => v.toLocaleString('en-GB') },
    },
    tooltip: { ...baseOptions.tooltip, shared: true, intersect: false },
  }
  return <Fit>{(w) => <Chart options={options} series={series} type="line" width={w} height={height} />}</Fit>
}
