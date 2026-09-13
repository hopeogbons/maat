import { cn } from 'cn'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { CHROME } from '../theme'
import { Sparkline } from './charts/Sparkline'

interface StatTileProps {
  label: string
  value: string
  /** Signed change against the previous window of the same length. */
  delta?: number
  /** Whether a rise is the good direction, for the delta's colour. */
  upIsGood?: boolean
  deltaSuffix?: string
  trend?: number[]
  trendColor?: string
  /** The one number the view leads with: rendered at hero size. */
  hero?: boolean
}

export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  deltaSuffix = 'vs previous period',
  trend,
  trendColor,
  hero = false,
}: StatTileProps) {
  const up = (delta ?? 0) >= 0
  const good = up === upIsGood
  const Icon = up ? TrendingUp : TrendingDown

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(17,23,25,0.04),0_8px_24px_-16px_rgba(17,23,25,0.18)]',
        hero && 'bg-[linear-gradient(150deg,var(--color-teal-deep),var(--color-teal))] border-transparent',
      )}
    >
      <p className={cn('text-xs font-semibold', hero ? 'text-white/70' : 'text-ink-muted')}>{label}</p>
      <p
        className={cn(
          'mt-1.5 font-bold tracking-tight',
          hero ? 'text-[2.75rem] leading-none text-white' : 'text-3xl text-teal-deep',
        )}
      >
        {value}
      </p>
      {delta !== undefined && (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold',
              hero
                ? 'bg-white/15 text-white'
                : good
                  ? 'bg-[#e6f2ea] text-[#006a3a]'
                  : 'bg-[#fbf0dc] text-[#c68102]',
            )}
          >
            <Icon className="size-3" />
            {up ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
          <span className={hero ? 'text-white/60' : 'text-ink-soft'}>{deltaSuffix}</span>
        </p>
      )}
      {trend && (
        <div className="-mx-1 mt-3">
          <Sparkline data={trend} color={hero ? CHROME.gold : (trendColor ?? CHROME.teal)} />
        </div>
      )}
    </div>
  )
}
