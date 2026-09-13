import type { ApexOptions } from 'apexcharts'
import Chart from 'react-apexcharts'
import { CHROME, FONT, VERDICT, VERDICT_LABEL, VERDICT_ORDER, baseOptions } from '../../theme'

/** Three concentric rings, one per verdict, each showing its share of the period. */
export function VerdictRings({ counts, size = 176 }: { counts: number[]; size?: number }) {
  const sum = counts.reduce((a, b) => a + b, 0) || 1
  const shares = counts.map((c) => Math.round((c / sum) * 100))
  const options: ApexOptions = {
    ...baseOptions,
    chart: { ...baseOptions.chart, type: 'radialBar', sparkline: { enabled: true } },
    colors: VERDICT_ORDER.map((v) => VERDICT[v]),
    labels: VERDICT_ORDER.map((v) => VERDICT_LABEL[v]),
    stroke: { lineCap: 'round' },
    plotOptions: {
      radialBar: {
        startAngle: -150,
        endAngle: 150,
        hollow: { size: '40%' },
        track: { background: '#ebe3d2', strokeWidth: '100%', margin: 3 },
        dataLabels: { show: false },
      },
    },
    tooltip: {
      enabled: true,
      custom: ({ seriesIndex }) =>
        `<div style="font-family:${FONT};padding:8px 12px">
          <div style="font-size:14px;font-weight:700;color:${CHROME.ink}">${counts[seriesIndex].toLocaleString('en-GB')} · ${shares[seriesIndex]}%</div>
          <div style="font-size:11px;color:${CHROME.inkSoft};margin-top:2px">${VERDICT_LABEL[VERDICT_ORDER[seriesIndex]]}</div>
        </div>`,
    },
  }
  return <Chart options={options} series={shares} type="radialBar" width={size} height={size} />
}
