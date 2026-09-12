import { LogIn, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/i18n'
import { SIGN_IN_URL } from '@/lib/api'
import { SITE } from '../site'
import { openWidget } from '../widgetBridge'
import { Brand } from './Brand'
import { LanguageMenu } from './LanguageMenu'

export function SiteHeader() {
  const { t } = useLanguage()
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-6 py-5 sm:px-10">
      <Brand />
      <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
        {SITE.nav.map((item) => (
          <a key={item.href} href={item.href} className="transition hover:text-white">
            {t.nav[item.key]}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <LanguageMenu />
        <a
          href={SIGN_IN_URL}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:px-4"
        >
          <LogIn className="size-4" />
          <span className="sr-only sm:not-sr-only">{t.common.signIn}</span>
        </a>
        <button
          type="button"
          onClick={openWidget}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <MessageCircle className="size-4" />
          <span className="sr-only sm:not-sr-only">{t.common.verifyRumour}</span>
        </button>
      </div>
    </header>
  )
}
