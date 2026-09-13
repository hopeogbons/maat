import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { Fit } from './Fit'
import type { Issuer } from '../../data'
import { CHROME, SERIES, axisLabelStyle, baseOptions } from '../../theme'

/**
 * Nominal categories with no natural order, so every bar takes the same hue:
 * length already carries the magnitude and the colour channel stays free.
 */
export function IssuerBars({ data, height = 300 }: { data: Issuer[]; height?: number }) {
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'bar' },
    colors: [SERIES[0]],
    plotOptions: {
      bar: {
        horizontal: true,
        // 7 rows in a 300px plot: 52% keeps every bar under the 24px cap.
        barHeight: '52%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      offsetX: 8,
      formatter: (v: number) => v.toLocaleString('en-GB'),
      style: {
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: baseOptions.chart.fontFamily,
        colors: [CHROME.inkMuted],
      },
    },
    grid: {
      ...baseOptions.grid,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { top: -8, right: 36, bottom: -8, left: 4 },
    },
    xaxis: {
      categories: data.map((d) => d.name),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: false },
    },
    yaxis: {
      labels: { style: axisLabelStyle, maxWidth: 190 },
    },
    tooltip: {
      ...baseOptions.tooltip,
      y: { formatter: (v: number) => `${v.toLocaleString('en-GB')} citations` },
    },
  }
  return (
    <Fit>
      {(w) => (
        <Chart
          options={options}
          series={[{ name: 'Citations', data: data.map((d) => d.citations) }]}
          type="bar"
          width={w}
          height={height}
        />
      )}
    </Fit>
  )
}
