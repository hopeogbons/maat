import { cn } from 'cn'
import { Eye, Feather, FileText, Quote, Scale, ScrollText, Search, ShieldCheck, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

interface Floater {
  icon: LucideIcon
  x: string
  y: string
  size: number
  rot: string
  anim: 'maat:animate-float' | 'maat:animate-float-slow' | 'maat:animate-drift'
  delay: string
  tone: 'gold' | 'white'
}

/* Biased towards the right and the edges so the wordmark stays legible. */
const FLOATERS: Floater[] = [
  { icon: Scale, x: '76%', y: '14%', size: 46, rot: '8deg', anim: 'maat:animate-float-slow', delay: '1.2s', tone: 'gold' },
  { icon: Feather, x: '58%', y: '62%', size: 38, rot: '-18deg', anim: 'maat:animate-float', delay: '0s', tone: 'gold' },
  { icon: ScrollText, x: '86%', y: '64%', size: 34, rot: '12deg', anim: 'maat:animate-drift', delay: '0.6s', tone: 'white' },
  { icon: ShieldCheck, x: '40%', y: '10%', size: 30, rot: '-8deg', anim: 'maat:animate-float', delay: '2s', tone: 'white' },
  { icon: Quote, x: '30%', y: '80%', size: 26, rot: '0deg', anim: 'maat:animate-drift', delay: '1.6s', tone: 'gold' },
  { icon: Search, x: '62%', y: '36%', size: 28, rot: '-25deg', anim: 'maat:animate-float-slow', delay: '0.9s', tone: 'white' },
  { icon: FileText, x: '4%', y: '68%', size: 30, rot: '15deg', anim: 'maat:animate-float', delay: '2.4s', tone: 'white' },
  { icon: Eye, x: '92%', y: '38%', size: 24, rot: '-6deg', anim: 'maat:animate-drift', delay: '3s', tone: 'gold' },
]

/** Faded icons drifting behind the welcome header, echoing the landing page hero. */
export function FloatingIcons() {
  return (
    <div aria-hidden="true" className="maat:pointer-events-none maat:absolute maat:inset-0 maat:overflow-hidden">
      <div className="maat:absolute maat:-top-32 maat:left-1/2 maat:size-96 maat:-translate-x-1/2 maat:rounded-full maat:bg-[radial-gradient(circle,oklch(0.77_0.13_85/0.18),transparent_60%)]" />
      {FLOATERS.map(({ icon: Icon, x, y, size, rot, anim, delay, tone }, i) => (
        <Icon
          key={i}
          strokeWidth={1.25}
          className={cn(
            'maat:absolute maat:motion-reduce:animate-none',
            anim,
            tone === 'gold' ? 'maat:text-gold/25' : 'maat:text-white/15',
          )}
          style={{ left: x, top: y, width: size, height: size, animationDelay: delay, '--rot': rot } as CSSProperties}
        />
      ))}
    </div>
  )
}
