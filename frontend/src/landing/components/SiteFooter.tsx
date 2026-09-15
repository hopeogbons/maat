import { Mail, MessageCircle, Phone, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { openSignIn } from '@/auth'
import { useLanguage, type Messages } from '@/i18n'
import { SITE } from '../site'
import { openWidget } from '../widgetBridge'
import { Brand } from './Brand'

type LinkKey = keyof Messages['footer']['links']

const COLUMNS: { heading: 'verify' | 'about'; items: { key: LinkKey; href: string; opensWidget?: boolean }[] }[] = [
  {
    heading: 'verify',
    items: [
      { key: 'latest', href: '#verifications' },
      { key: 'how', href: '#how-it-works' },
      { key: 'submit', href: '#', opensWidget: true },
      { key: 'methodology', href: '/methodology' },
      { key: 'sources', href: '/sources' },
    ],
  },
  {
    heading: 'about',
    items: [
      { key: 'aboutMaat', href: '/about' },
      { key: 'team', href: '/team' },
      { key: 'partners', href: '/partners' },
      { key: 'press', href: '/press' },
      { key: 'careers', href: '/careers' },
    ],
  },
]

export function SiteFooter() {
  const { t } = useLanguage()
  return (
    <footer id="contact" className="scroll-mt-16 bg-teal-deep text-white/75">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Brand size="lg" />
            <p className="mt-4 max-w-sm leading-relaxed">{t.footer.blurb}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {SITE.social.map(({ name, handle, href, icon: Icon }) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${name}: ${handle}`}
                    title={`${name} · ${handle}`}
                    className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:border-gold hover:bg-white/10 hover:text-gold"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={t.footer[column.heading]} className="lg:col-span-2">
              <h3 className="text-sm font-bold tracking-widest text-gold uppercase">{t.footer[column.heading]}</h3>
              <ul className="mt-2 space-y-0.5">
                {column.items.map((item) => (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      onClick={
                        item.opensWidget
                          ? (event) => {
                              event.preventDefault()
                              openWidget()
                            }
                          : undefined
                      }
                      className="inline-flex min-h-9 items-center transition hover:text-white"
                    >
                      {t.footer.links[item.key]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="lg:col-span-4">
            <h3 className="text-sm font-bold tracking-widest text-gold uppercase">{t.footer.contact}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={`tel:${SITE.helpline.tel}`} className="flex items-start gap-3 transition hover:text-white">
                  <Phone className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-base font-semibold text-white">{SITE.helpline.display}</span>
                    <span className="block text-sm">
                      {SITE.helpline.digits} · {t.footer.helplineHours}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={SITE.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 transition hover:text-white"
                >
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-semibold text-white">{t.footer.whatsapp}</span>
                    <span className="block text-sm">{SITE.whatsapp.display}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="flex items-start gap-3 transition hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-semibold text-white">{SITE.email}</span>
                    <span className="block text-sm">
                      {t.footer.pressLabel}: {SITE.pressEmail}
                    </span>
                  </span>
                </a>
              </li>
            </ul>

            <Newsletter />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.copyright(new Date().getFullYear())}</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><a href="/privacy" className="inline-flex min-h-9 items-center transition hover:text-white">{t.footer.privacy}</a></li>
            <li><a href="/terms" className="inline-flex min-h-9 items-center transition hover:text-white">{t.footer.terms}</a></li>
            <li><a href="/corrections" className="inline-flex min-h-9 items-center transition hover:text-white">{t.footer.corrections}</a></li>
            <li><a href="/accessibility" className="inline-flex min-h-9 items-center transition hover:text-white">{t.footer.accessibility}</a></li>
            <li><button type="button" onClick={() => openSignIn()} className="inline-flex min-h-9 items-center font-semibold text-gold transition hover:text-white">{t.common.signIn}</button></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

function Newsletter() {
  const { t } = useLanguage()
  const [submitted, setSubmitted] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold tracking-widest text-gold uppercase">{t.footer.digestTitle}</h3>
      <p className="mt-2 text-sm">{t.footer.digestText}</p>
      {submitted ? (
        <p className="mt-3 rounded-xl border border-gold/40 bg-white/5 px-4 py-3 text-sm text-white" role="status">
          {t.footer.digestThanks}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <label htmlFor="digest-email" className="sr-only">
            {t.footer.emailLabel}
          </label>
          <input
            id="digest-email"
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/40 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t.footer.subscribe}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gold text-gold-dark transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </div>
  )
}
