import { cn } from 'cn'
import { Feather } from 'lucide-react'

const SIZES = {
  xs: { box: 'maat:size-6', icon: 'maat:size-3' },
  sm: { box: 'maat:size-8', icon: 'maat:size-4' },
  lg: { box: 'maat:size-14', icon: 'maat:size-7' },
} as const

/** The Maat mark: a feather, after the goddess of truth, on warm gold. */
export function Emblem({ size = 'sm', className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden="true"
      className={cn(
        'maat:inline-flex maat:shrink-0 maat:items-center maat:justify-center maat:rounded-full maat:bg-gold maat:text-gold-foreground maat:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]',
        s.box,
        className,
      )}
    >
      <Feather className={s.icon} strokeWidth={2.25} />
    </span>
  )
}
