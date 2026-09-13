import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { CHROME, FONT } from '../../theme'

/**
 * The trend line inside a stat tile. Twelve points, no axes, no tooltip: the
 * value beside it is the number, this is only its shape.
 */
export function Sparkline({ data, color = CHROME.teal }: { data: number[]; color?: string }) {
  const options: ApexOptions = {
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      fontFamily: FONT,
      animations: { enabled: false },
    },
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: { type: 'solid', opacity: 0.1 },
    colors: [color],
    tooltip: { enabled: false },
    markers: { size: 0 },
  }
  return (
    <div aria-hidden="true" className="h-9">
      <Chart options={options} series={[{ name: 'trend', data }]} type="area" height={36} />
    </div>
  )
}
