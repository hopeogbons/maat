import { ChevronDown } from 'lucide-react'
import { RANGES, type RangeKey } from '../data'

export function RangeSelect({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (value: RangeKey) => void
}) {
  return (
    <div className="relative">
      <label htmlFor="range" className="sr-only">
        Date range
      </label>
      <select
        id="range"
        value={value}
        onChange={(event) => onChange(event.target.value as RangeKey)}
        className="h-9 appearance-none rounded-full border border-teal-deep/20 bg-white pr-9 pl-4 text-sm font-medium text-teal-deep focus:border-gold focus:outline-none"
      >
        {RANGES.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-teal-deep"
      />
    </div>
  )
}
