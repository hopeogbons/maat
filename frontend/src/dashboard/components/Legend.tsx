/**
 * The dependable identity channel: a legend is present whenever a chart draws
 * two or more series. The swatch carries the colour; the text stays in ink.
 */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map(({ label, color }) => (
        <li key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          {label}
        </li>
      ))}
    </ul>
  )
}
