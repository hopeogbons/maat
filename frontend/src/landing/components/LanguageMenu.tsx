import { cn } from 'cn'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { groupLanguages, loadCoverage, useLanguage, type AvailableLanguageCode, type CountryCode, type Language } from '@/i18n'

/**
 * Language picker: English on its own at the top (it belongs to no country),
 * then each country as a section that expands into its languages.
 */
export function LanguageMenu() {
  const { code, language, t, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<CountryCode | null>(language.country ?? null)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const { global, countries } = groupLanguages()
  useEffect(() => {
    void loadCoverage()
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = () => {
    setExpanded(language.country ?? null)
    setOpen((value) => !value)
  }

  const choose = (next: AvailableLanguageCode) => {
    setLanguage(next)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t.common.language}: ${language.name}`}
        onClick={toggle}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Globe className="size-4" />
        <span className="hidden sm:inline">{language.name}</span>
        <span className="uppercase sm:hidden">{code}</span>
        <ChevronDown className={cn('size-3.5 opacity-70 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.common.chooseLanguage}
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-white p-2 text-ink shadow-xl shadow-teal-deep/20"
        >
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-widest text-ink-muted uppercase">
            {t.common.chooseLanguage}
          </p>

          {global.map((item) => (
            <LanguageRow
              key={item.code}
              language={item}
              selected={item.code === code}
              comingSoon={t.common.comingSoon}
              onSelect={choose}
              icon={<Globe className="size-4 text-teal" />}
            />
          ))}

          {countries.map((country) => {
            const isOpen = expanded === country.code
            return (
              <div key={country.code} className="mt-1 border-t border-line pt-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : country.code)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-teal-deep transition hover:bg-sand"
                >
                  <span className="flex-1">{t.countries[country.code]}</span>
                  <ChevronDown className={cn('size-4 text-ink-muted transition', isOpen && 'rotate-180')} />
                </button>
                {isOpen && (
                  <ul className="pb-1">
                    {country.languages.map((item) => (
                      <li key={item.code}>
                        <LanguageRow
                          language={item}
                          selected={item.code === code}
                          comingSoon={t.common.comingSoon}
                          onSelect={choose}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LanguageRow({
  language,
  selected,
  comingSoon,
  onSelect,
  icon,
}: {
  language: Language
  selected: boolean
  comingSoon: string
  onSelect: (code: AvailableLanguageCode) => void
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={!language.available}
      aria-pressed={selected}
      onClick={() => language.available && onSelect(language.code as AvailableLanguageCode)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
        selected ? 'bg-teal-soft text-teal-deep' : 'hover:bg-sand',
        !language.available && 'cursor-not-allowed opacity-60',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{language.name}</span>
        {language.englishName !== language.name && (
          <span className="block text-xs text-ink-muted">{language.englishName}</span>
        )}
      </span>
      {!language.available ? (
        <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
          {comingSoon}
        </span>
      ) : (
        selected && <Check className="size-4 text-teal" />
      )}
    </button>
  )
}
