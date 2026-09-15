import { cn } from 'cn'
import {
  AtSign,
  ChevronRight,
  Hash,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  Mic,
  Phone,
  Radio,
  Send,
  Share2,
  Smartphone,
  Voicemail,
} from 'lucide-react'
import type { ComponentType, CSSProperties, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import { FacebookIcon, XIcon } from '@/landing/components/BrandIcons'
import { SERIES } from '../theme'

interface Card {
  name: string
  handle: string
  change: number
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: string
}

const CARDS: Card[] = [
  { name: 'WhatsApp', handle: '0800 000 6228', change: 6, Icon: MessageCircle, tone: SERIES[0] },
  { name: 'Voice note', handle: 'In-app', change: 9, Icon: Mic, tone: SERIES[1] },
  { name: 'X', handle: '@maatverify', change: 2, Icon: XIcon, tone: SERIES[2] },
  { name: 'Facebook', handle: 'maatverify', change: -3, Icon: FacebookIcon, tone: SERIES[3] },
]

/**
 * The ways a rumour reaches Ma'at, drifting faintly behind the cards. Placed by
 * hand so none sits under a card's number: the flanks and the top edge are the
 * open ground, the middle is the cards'.
 */
const STREWN = [
  { icon: MessageCircle, x: '2%', y: '10%', size: 54, rot: '-12deg', anim: 'animate-float', delay: '0s' },
  { icon: Mic, x: '9%', y: '62%', size: 40, rot: '10deg', anim: 'animate-drift', delay: '1.3s' },
  { icon: Smartphone, x: '4%', y: '84%', size: 34, rot: '16deg', anim: 'animate-float-slow', delay: '2.4s' },
  { icon: Hash, x: '15%', y: '24%', size: 30, rot: '-8deg', anim: 'animate-drift', delay: '3.1s' },
  { icon: Share2, x: '20%', y: '88%', size: 30, rot: '12deg', anim: 'animate-float', delay: '0.8s' },
  { icon: AtSign, x: '26%', y: '6%', size: 28, rot: '-18deg', anim: 'animate-float-slow', delay: '1.9s' },
  { icon: Radio, x: '36%', y: '3%', size: 30, rot: '8deg', anim: 'animate-drift', delay: '2.7s' },
  { icon: Send, x: '47%', y: '2%', size: 26, rot: '-6deg', anim: 'animate-float', delay: '3.6s' },
  { icon: Megaphone, x: '58%', y: '4%', size: 32, rot: '14deg', anim: 'animate-float-slow', delay: '0.4s' },
  { icon: Voicemail, x: '69%', y: '2%', size: 28, rot: '-10deg', anim: 'animate-drift', delay: '4.2s' },
  { icon: MessagesSquare, x: '80%', y: '5%', size: 34, rot: '6deg', anim: 'animate-float', delay: '1.6s' },
  { icon: Phone, x: '92%', y: '12%', size: 36, rot: '-14deg', anim: 'animate-float-slow', delay: '2.2s' },
  { icon: MessageSquareText, x: '95%', y: '52%', size: 42, rot: '8deg', anim: 'animate-drift', delay: '0.6s' },
  { icon: Smartphone, x: '90%', y: '86%', size: 32, rot: '-20deg', anim: 'animate-float', delay: '3.3s' },
  { icon: Hash, x: '78%', y: '92%', size: 26, rot: '18deg', anim: 'animate-float-slow', delay: '1.1s' },
  { icon: Mic, x: '62%', y: '94%', size: 28, rot: '-8deg', anim: 'animate-drift', delay: '4.6s' },
  { icon: Share2, x: '46%', y: '95%', size: 26, rot: '10deg', anim: 'animate-float', delay: '2.9s' },
  { icon: MessageCircle, x: '31%', y: '96%', size: 30, rot: '-16deg', anim: 'animate-float-slow', delay: '0.2s' },
  { icon: Radio, x: '10%', y: '40%', size: 26, rot: '20deg', anim: 'animate-float', delay: '3.8s' },
  { icon: AtSign, x: '97%', y: '30%', size: 24, rot: '-4deg', anim: 'animate-drift', delay: '1.4s' },
]

/**
 * One band holding the channel cards, on the same frosted surface as the
 * forms and the source cards: a cool tint, a warm pool under the middle, and
 * the ways a rumour arrives drifting faintly behind.
 */
export function ChannelPanel() {
  return (
    <section className="panel-glow relative isolate grid min-w-0 gap-8 overflow-hidden rounded-[1.5rem] border border-teal/20 bg-teal-soft/45 px-5 pt-12 pb-8 sm:px-9 sm:pb-9 lg:grid-cols-[12rem_1fr] lg:gap-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-gold-soft)_0%,transparent_62%)] opacity-70" />
        {STREWN.map(({ icon: Icon, x, y, size, rot, anim, delay }, i) => (
          <Icon
            key={i}
            strokeWidth={1.25}
            className={cn('absolute hidden text-teal/15 motion-reduce:animate-none sm:block', anim)}
            style={{ left: x, top: y, width: size, height: size, animationDelay: delay, '--rot': rot } as CSSProperties}
          />
        ))}
      </div>

      <div className="self-center">
        <h2 className="font-serif text-[1.65rem] font-bold tracking-tight text-teal-deep">Channels</h2>
        <p className="mt-3 max-w-[11rem] text-[13px] leading-relaxed text-ink-muted">
          Rumours reaching Ma’at over a <strong className="font-bold text-ink">1 week</strong> period.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 xl:grid-cols-5">
        {CARDS.map(({ name, handle, change, Icon, tone }) => (
          <article
            key={name}
            className="relative rounded-[1.25rem] bg-white px-2 pt-8 pb-5 text-center shadow-[0_12px_30px_-24px_rgba(17,23,25,0.55)] sm:px-3 sm:pb-6"
          >
            <span
              aria-hidden="true"
              className="absolute -top-[18px] left-1/2 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: tone }}
            >
              <Icon className="size-4" />
            </span>
            <p className="text-[14px] font-bold text-ink">{name}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">{handle}</p>
            <p className="mt-4 text-[1.75rem] leading-none font-medium tracking-tight text-ink">
              {change > 0 ? '+' : '−'}
              {Math.abs(change)}
              <span className="ml-1 align-super text-[12px] font-bold">%</span>
            </p>
          </article>
        ))}

        <Link
          to="/rumours"
          className="relative col-span-2 flex flex-col justify-between overflow-hidden rounded-[1.25rem] bg-teal-deep p-5 text-white transition hover:bg-teal xl:col-span-1"
        >
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-20 [background-image:radial-gradient(rgba(255,255,255,0.22)_1.6px,transparent_2.1px)] [background-size:11px_11px]"
          />
          <span className="relative font-serif text-[1.35rem] leading-tight font-bold text-gold">Full stats</span>
          <span
            aria-hidden="true"
            className="relative mt-4 inline-flex size-10 items-center justify-center rounded-full bg-gold text-teal-deep sm:mt-6 sm:size-9"
          >
            <ChevronRight className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  )
}
