import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { Fit } from './Fit'
import { CHROME, FONT, axisLabelStyle, baseOptions } from '../../theme'

const dayLabel = new Intl.DateTimeFormat('en-GB', { day: '2-digit' })
const fullLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * One series, so no legend: the heading says what is plotted. Everything else
 * is stripped back to the line, four gridlines and the axis.
 */
export function ActivityLine({
  dates,
  values,
  height = 260,
}: {
  dates: string[]
  values: number[]
  height?: number
}) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'line', sparkline: { enabled: false } },
    colors: [CHROME.gold],
    stroke: { width: 3, curve: 'smooth', lineCap: 'round' },
    markers: {
      size: 0,
      colors: [CHROME.gold],
      strokeColors: CHROME.surface,
      strokeWidth: 3,
      hover: { size: 7 },
    },
    grid: {
      ...baseOptions.grid,
      borderColor: '#eef1f1',
      padding: { top: 8, right: 12, bottom: 0, left: 0 },
    },
    xaxis: {
      categories: dates,
      tickAmount: Math.min(7, dates.length - 1),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      crosshairs: { show: false },
      labels: {
        style: { ...axisLabelStyle, fontSize: '12px' },
        formatter: (v: string) => (v ? dayLabel.format(new Date(`${v}T00:00:00`)) : ''),
      },
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      labels: {
        style: { ...axisLabelStyle, fontSize: '12px' },
        // Room for the widest tick, so the top label is never shaved on a phone.
        minWidth: 32,
        offsetX: -4,
        formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`),
      },
    },
    tooltip: {
      enabled: true,
      followCursor: false,
      custom: ({ series, seriesIndex, dataPointIndex }) => {
        const value = series[seriesIndex][dataPointIndex] as number
        const when = fullLabel.format(new Date(`${dates[dataPointIndex]}T00:00:00`))
        return `<div style="font-family:${FONT};padding:10px 16px;text-align:center">
            <div style="font-size:15px;font-weight:700;color:${CHROME.ink};letter-spacing:0.02em">${value.toLocaleString('en-GB')}</div>
            <div style="font-size:11px;color:${CHROME.inkSoft};margin-top:2px">Rumours · ${when}</div>
          </div>`
      },
    },
  }
  return (
    <Fit>
      {(w) => (
        <Chart
          options={options}
          series={[{ name: 'Rumours', data: values }]}
          type="line"
          width={w}
          height={height}
        />
      )}
    </Fit>
  )
}
