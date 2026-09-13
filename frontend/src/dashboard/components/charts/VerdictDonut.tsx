import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { Fit } from './Fit'
import { CHROME, FONT, VERDICT, VERDICT_LABEL, VERDICT_ORDER, compact } from '../../theme'

/**
 * Part-to-whole at a glance, three segments. The total sits in the middle so
 * the reader never has to add the slices up.
 */
export function VerdictDonut({ counts, height = 260 }: { counts: number[]; height?: number }) {
  const options: ApexOptions = {
    chart: { type: 'donut', fontFamily: FONT, animations: { speed: 320 } },
    colors: VERDICT_ORDER.map((v) => VERDICT[v]),
    labels: VERDICT_ORDER.map((v) => VERDICT_LABEL[v]),
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [CHROME.surface] },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { show: true, offsetY: 18, fontSize: '11px', color: CHROME.inkSoft },
            value: {
              show: true,
              offsetY: -14,
              fontSize: '28px',
              fontWeight: 700,
              color: CHROME.ink,
              formatter: (v: string) => compact(Number(v)),
            },
            total: {
              show: true,
              label: 'Rumours weighed',
              fontSize: '11px',
              fontWeight: 600,
              color: CHROME.inkSoft,
              formatter: (w) =>
                compact(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
            },
          },
        },
      },
    },
    tooltip: {
      theme: 'light',
      style: { fontSize: '12px', fontFamily: FONT },
      y: { formatter: (v: number) => v.toLocaleString('en-GB') },
    },
  }
  return <Fit>{(w) => <Chart options={options} series={counts} type="donut" width={w} height={height} />}</Fit>
}
