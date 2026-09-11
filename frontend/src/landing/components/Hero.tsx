import { ArrowDown, ChevronDown, Feather, MessageCircle, Quote, Scale, ShieldCheck } from 'lucide-react'
import { SITE } from '../site'
import { openWidget } from '../widgetBridge'
import { FloatingIcons } from './FloatingIcons'
import { SiteHeader } from './SiteHeader'

const PROMISES = [
  { icon: Scale, text: 'Every claim weighed against official documents' },
  { icon: Quote, text: 'Every answer cited, with a link to the original' },
  { icon: ShieldCheck, text: 'When there is no source, Maat says so' },
]

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[linear-gradient(160deg,var(--color-teal-deep),var(--color-teal))] text-white"
    >
      <FloatingIcons />
      <SiteHeader />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pt-10 pb-28 text-center sm:px-10 sm:pb-12">
        <div className="animate-rise motion-reduce:animate-none">
          <span
            aria-hidden="true"
            className="mx-auto flex size-20 items-center justify-center rounded-full bg-gold text-gold-dark shadow-[0_20px_60px_-15px_oklch(0.77_0.13_85/0.6),inset_0_0_0_2px_rgba(255,255,255,0.35)] sm:size-24"
          >
            <Feather className="size-10 sm:size-12" strokeWidth={2.25} />
          </span>
          <h1 className="mt-6 text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl">Maat</h1>
          <p className="mt-4 font-serif text-xl text-gold italic sm:text-2xl md:text-3xl">
            “{SITE.tagline}.”
          </p>
        </div>

        <p
          className="mt-6 max-w-3xl text-lg leading-relaxed font-semibold text-white/90 [animation-delay:150ms] animate-rise motion-reduce:animate-none sm:text-xl md:text-[1.375rem] md:leading-relaxed"
        >
          Maat is the ancient Egyptian goddess of truth, balance and justice. In the Hall of Two
          Truths every heart was weighed against her feather, and only a heart as light as the truth
          could pass. Maat does the same with rumours: every claim is weighed against the official
          record, and you get a verdict you can trust.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 [animation-delay:300ms] animate-rise motion-reduce:animate-none">
          <button
            type="button"
            onClick={openWidget}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-6 text-base font-bold text-gold-dark shadow-lg shadow-gold/25 transition hover:-translate-y-0.5 hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MessageCircle className="size-5" />
            Verify a rumour
          </button>
          <a
            href="#verifications"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/30 px-6 text-base font-semibold text-white transition hover:border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Read verifications
            <ArrowDown className="size-4" />
          </a>
        </div>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/70 [animation-delay:450ms] animate-rise motion-reduce:animate-none">
          {PROMISES.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-2">
              <Icon className="size-4 text-gold" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="#how-it-works"
        aria-label="Scroll to how it works"
        className="relative z-10 mx-auto mb-6 inline-flex size-10 items-center justify-center rounded-full text-white/60 transition hover:text-white"
      >
        <ChevronDown className="size-6 animate-bounce motion-reduce:animate-none" />
      </a>
    </section>
  )
}
