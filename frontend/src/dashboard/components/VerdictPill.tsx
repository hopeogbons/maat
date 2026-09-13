import { cn } from 'cn'
import { CircleAlert, CircleDashed, ShieldCheck, type LucideIcon } from 'lucide-react'
import { VERDICT, VERDICT_LABEL, VERDICT_TINT, type Verdict } from '../theme'

const ICON: Record<Verdict, LucideIcon> = {
  verified: ShieldCheck,
  unverified: CircleAlert,
  insufficient: CircleDashed,
}

/** Status never travels on colour alone: every verdict carries its icon and label. */
export function VerdictPill({ verdict, className }: { verdict: Verdict; className?: string }) {
  const Icon = ICON[verdict]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        className,
      )}
      style={{ backgroundColor: VERDICT_TINT[verdict], color: VERDICT[verdict] }}
    >
      <Icon className="size-3" />
      {VERDICT_LABEL[verdict]}
    </span>
  )
}
