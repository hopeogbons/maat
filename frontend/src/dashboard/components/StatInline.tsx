import { cn } from 'cn'
import { ArrowDown, ArrowUp } from 'lucide-react'

/** Label, a hairline rule with the trend at its end, then the number. No card. */
export function StatInline({
  label,
  value,
  up,
  good = up,
}: {
  label: string
  value: string
  up: boolean
  good?: boolean
}) {
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <div className="min-w-0 sm:min-w-[7.5rem]">
      <div className="flex items-center justify-between gap-2 border-b border-gold/50 pb-1.5 sm:gap-8">
        <span className="truncate text-[13px] text-ink-muted">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-[15px] items-center justify-center rounded-full text-white',
            good ? 'bg-[#2f9e6b]' : 'bg-[#d3a23a]',
          )}
        >
          <Icon className="size-2" strokeWidth={3.5} />
        </span>
      </div>
      <p className="mt-2.5 font-serif text-[1.45rem] leading-none font-bold tracking-tight text-teal-deep sm:text-[1.85rem]">
        {value}
      </p>
    </div>
  )
}
