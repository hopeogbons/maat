import { cn } from 'cn'
import {
  CheckCheck,
  Eye,
  Feather,
  FileText,
  Globe,
  Landmark,
  MessageCircle,
  Quote,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

interface Floater {
  icon: LucideIcon
  x: string
  y: string
  size: number
  rot: string
  anim: 'animate-float' | 'animate-float-slow' | 'animate-drift'
  delay: string
  tone: 'gold' | 'white'
  /** Hide on small screens to keep the hero uncluttered. */
  desktopOnly?: boolean
}

const FLOATERS: Floater[] = [
  { icon: Feather, x: '6%', y: '16%', size: 64, rot: '-18deg', anim: 'animate-float', delay: '0s', tone: 'gold' },
  { icon: Scale, x: '86%', y: '20%', size: 72, rot: '8deg', anim: 'animate-float-slow', delay: '1.5s', tone: 'gold' },
  { icon: ScrollText, x: '10%', y: '68%', size: 56, rot: '12deg', anim: 'animate-drift', delay: '0.6s', tone: 'white' },
  { icon: ShieldCheck, x: '82%', y: '70%', size: 60, rot: '-8deg', anim: 'animate-float', delay: '2.2s', tone: 'gold' },
  { icon: Search, x: '28%', y: '10%', size: 44, rot: '-25deg', anim: 'animate-drift', delay: '3s', tone: 'white', desktopOnly: true },
  { icon: FileText, x: '68%', y: '8%', size: 48, rot: '15deg', anim: 'animate-float-slow', delay: '0.9s', tone: 'white', desktopOnly: true },
  { icon: Quote, x: '48%', y: '88%', size: 40, rot: '0deg', anim: 'animate-float', delay: '1.1s', tone: 'gold' },
  { icon: Eye, x: '93%', y: '46%', size: 44, rot: '-6deg', anim: 'animate-drift', delay: '2.6s', tone: 'white', desktopOnly: true },
  { icon: MessageCircle, x: '3%', y: '42%', size: 48, rot: '10deg', anim: 'animate-float-slow', delay: '1.8s', tone: 'white' },
  { icon: Landmark, x: '62%', y: '80%', size: 52, rot: '-4deg', anim: 'animate-float', delay: '0.3s', tone: 'white', desktopOnly: true },
  { icon: CheckCheck, x: '20%', y: '86%', size: 40, rot: '20deg', anim: 'animate-drift', delay: '2s', tone: 'gold', desktopOnly: true },
  { icon: Globe, x: '42%', y: '4%', size: 40, rot: '0deg', anim: 'animate-float-slow', delay: '1.3s', tone: 'gold', desktopOnly: true },
]

/** Faded icons drifting slowly across the hero. Purely decorative. */
export function FloatingIcons() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 size-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.77_0.13_85/0.16),transparent_60%)]" />
      {FLOATERS.map(({ icon: Icon, x, y, size, rot, anim, delay, tone, desktopOnly }, i) => (
        <Icon
          key={i}
          strokeWidth={1.25}
          className={cn(
            'absolute motion-reduce:animate-none',
            anim,
            tone === 'gold' ? 'text-gold/25' : 'text-white/15',
            desktopOnly && 'hidden md:block',
          )}
          style={{ left: x, top: y, width: size, height: size, animationDelay: delay, '--rot': rot } as CSSProperties}
        />
      ))}
    </div>
  )
}
