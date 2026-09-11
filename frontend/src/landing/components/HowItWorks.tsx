import { FileText, MessageCircle, Scale } from 'lucide-react'
import { VerdictBadge } from './VerdictBadge'

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Send',
    text: 'Type the rumour or send a voice note in the chat at the corner of this page. Say where you saw it if you can.',
  },
  {
    icon: Scale,
    title: 'Weigh',
    text: 'Maat searches gazettes, circulars and press statements from the issuing bodies and weighs the claim against what they actually say.',
  },
  {
    icon: FileText,
    title: 'Cite',
    text: 'You get a verdict, the answer in plain language, the source with its issuing body and date, and a link to the original document.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-widest text-gold-dark uppercase">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-teal-deep sm:text-4xl">
            Three steps from rumour to record
          </h2>
          <p className="mt-3 text-lg text-ink-muted">
            No guesswork and no opinion. Maat only reports what an official document supports, and
            tells you when it cannot find one.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
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
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-dashed border-line bg-white/60 px-6 py-4 text-sm text-ink-muted">
          <span className="font-semibold text-teal-deep">Every verdict is one of three:</span>
          <span className="inline-flex items-center gap-2">
            <VerdictBadge verdict="verified" />
            the record supports it
          </span>
          <span className="inline-flex items-center gap-2">
            <VerdictBadge verdict="unverified" />
            the record contradicts it
          </span>
          <span className="inline-flex items-center gap-2">
            <VerdictBadge verdict="insufficient" />
            no verified source found
          </span>
        </div>
      </div>
    </section>
  )
}
