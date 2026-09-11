import { FileText, MessageCircle, Scale } from 'lucide-react'
import { useLanguage, type Verdict } from '@/i18n'
import { VerdictBadge } from './VerdictBadge'

const STEP_ICONS = [MessageCircle, Scale, FileText]
const VERDICTS: Verdict[] = ['verified', 'unverified', 'insufficient']

export function HowItWorks() {
  const { t } = useLanguage()
  return (
    <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-widest text-gold-dark uppercase">{t.how.eyebrow}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-teal-deep sm:text-4xl">{t.how.title}</h2>
          <p className="mt-3 text-lg text-ink-muted">{t.how.lead}</p>
          <p className="mt-3 text-lg text-ink-muted">{t.how.intro}</p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {t.how.steps.map(({ title, text }, i) => {
            const Icon = STEP_ICONS[i]
            return (
              <li
                key={title}
                className="relative rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute top-5 right-5 font-serif text-4xl text-gold/60 italic">0{i + 1}</span>
                <span className="inline-flex size-12 items-center justify-center rounded-xl bg-teal-soft text-teal">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-teal-deep">{title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{text}</p>
              </li>
            )
          })}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-dashed border-line bg-white/60 px-6 py-4 text-sm text-ink-muted">
          <span className="font-semibold text-teal-deep">{t.how.legendIntro}</span>
          {VERDICTS.map((verdict) => (
            <span key={verdict} className="inline-flex items-center gap-2">
              <VerdictBadge verdict={verdict} />
              {t.how.legend[verdict]}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
