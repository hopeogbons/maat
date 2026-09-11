import { cn } from 'cn'
import { CircleAlert, CircleDashed, ShieldCheck, type LucideIcon } from 'lucide-react'
import { VERDICT_LABEL, type Verdict } from '../data/articles'

const STYLES: Record<Verdict, { icon: LucideIcon; className: string }> = {
  verified: { icon: ShieldCheck, className: 'border-verified/30 bg-verified-soft text-verified' },
  unverified: { icon: CircleAlert, className: 'border-unverified/30 bg-unverified-soft text-unverified' },
  insufficient: { icon: CircleDashed, className: 'border-insufficient/30 bg-insufficient-soft text-insufficient' },
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[verdict]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {VERDICT_LABEL[verdict]}
    </span>
  )
}
