import { Mail, MessageCircle, Phone, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { SITE } from '../site'
import { openWidget } from '../widgetBridge'
import { Brand } from './Brand'

const LINKS = {
  Verify: [
    { label: 'Latest verifications', href: '#verifications' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Submit a rumour', href: '#', onClick: openWidget },
    { label: 'Our methodology', href: '/methodology' },
    { label: 'Sources we use', href: '/sources' },
  ],
  About: [
    { label: 'About Maat', href: '/about' },
    { label: 'The team', href: '/team' },
    { label: 'Partners', href: '/partners' },
    { label: 'Press', href: '/press' },
    { label: 'Careers', href: '/careers' },
  ],
}

export function SiteFooter() {
  return (
    <footer id="contact" className="scroll-mt-16 bg-teal-deep text-white/75">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Brand size="lg" />
            <p className="mt-4 max-w-sm leading-relaxed">
              Named after the goddess who weighed every heart against a feather. Maat weighs rumours
              against the official record and shows you the document behind every answer.
            </p>
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

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, items]) => (
            <nav key={heading} aria-label={heading} className="lg:col-span-2">
              <h3 className="text-sm font-bold tracking-widest text-gold uppercase">{heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      onClick={
                        'onClick' in item && item.onClick
                          ? (event) => {
                              event.preventDefault()
                              item.onClick()
                            }
                          : undefined
                      }
                      className="transition hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact + newsletter */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-bold tracking-widest text-gold uppercase">Contact</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={`tel:${SITE.helpline.tel}`} className="group flex items-start gap-3 transition hover:text-white">
                  <Phone className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block text-base font-semibold text-white">{SITE.helpline.display}</span>
                    <span className="block text-sm">
                      {SITE.helpline.digits} · {SITE.helpline.hours}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition hover:text-white">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-semibold text-white">WhatsApp</span>
                    <span className="block text-sm">{SITE.whatsapp.display}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="flex items-start gap-3 transition hover:text-white">
                  <Mail className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-semibold text-white">{SITE.email}</span>
                    <span className="block text-sm">Press: {SITE.pressEmail}</span>
                  </span>
                </a>
              </li>
            </ul>

            <Newsletter />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. Weighing rumours against the record.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><a href="/privacy" className="transition hover:text-white">Privacy</a></li>
            <li><a href="/terms" className="transition hover:text-white">Terms</a></li>
            <li><a href="/corrections" className="transition hover:text-white">Corrections</a></li>
            <li><a href="/accessibility" className="transition hover:text-white">Accessibility</a></li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

function Newsletter() {
  const [submitted, setSubmitted] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold tracking-widest text-gold uppercase">Weekly digest</h3>
      <p className="mt-2 text-sm">The rumours we weighed this week, in one email.</p>
      {submitted ? (
        <p className="mt-3 rounded-xl border border-gold/40 bg-white/5 px-4 py-3 text-sm text-white" role="status">
          Thanks. Look out for the first digest on Friday.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <label htmlFor="digest-email" className="sr-only">
            Email address
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
            aria-label="Subscribe"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gold text-gold-dark transition hover:bg-gold/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </div>
  )
}
