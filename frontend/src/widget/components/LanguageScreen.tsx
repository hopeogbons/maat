import { cn } from 'cn'
import { ArrowLeft, Check, ChevronDown, Globe, X } from 'lucide-react'
import { useState } from 'react'
import { groupLanguages, useLanguage, type AvailableLanguageCode, type CountryCode, type Language } from '@/i18n'
import { Button } from '../ui/button'

interface LanguageScreenProps {
  onBack: () => void
  onClose: () => void
}

/** Language picker inside the widget: English first, then each country's languages. */
export function LanguageScreen({ onBack, onClose }: LanguageScreenProps) {
  const { code, language, t, setLanguage } = useLanguage()
  const [expanded, setExpanded] = useState<CountryCode | null>(language.country ?? 'NG')
  const { global, countries } = groupLanguages()
  const headerButton = 'maat:text-primary-foreground/80 maat:hover:bg-white/10 maat:hover:text-primary-foreground'

  const choose = (next: AvailableLanguageCode) => {
    setLanguage(next)
    onBack()
  }

  return (
    <div className="maat:flex maat:h-full maat:flex-col">
      <header className="maat:flex maat:items-center maat:gap-2 maat:bg-primary maat:px-2 maat:py-2.5 maat:text-primary-foreground">
        <Button variant="ghost" size="icon-sm" aria-label={t.common.back} onClick={onBack} className={headerButton}>
          <ArrowLeft />
        </Button>
        <div className="maat:min-w-0 maat:flex-1">
          <p className="maat:font-heading maat:text-sm maat:leading-tight maat:font-semibold">{t.common.chooseLanguage}</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t.widget.close} onClick={onClose} className={headerButton}>
          <X />
        </Button>
      </header>

      <div className="maat:flex-1 maat:overflow-y-auto maat:overscroll-contain maat:p-3">
        <div className="maat:mx-auto maat:w-full maat:max-w-xl">
          {global.map((item) => (
            <LanguageRow
              key={item.code}
              language={item}
              selected={item.code === code}
              comingSoon={t.common.comingSoon}
              onSelect={choose}
              icon={<Globe className="maat:size-4 maat:text-primary" />}
            />
          ))}

          {countries.map((country) => {
            const isOpen = expanded === country.code
            return (
              <div key={country.code} className="maat:mt-2 maat:border-t maat:border-border maat:pt-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : country.code)}
                  className="maat:flex maat:w-full maat:items-center maat:gap-3 maat:rounded-xl maat:px-3 maat:py-2.5 maat:text-left maat:text-sm maat:font-semibold maat:text-foreground maat:transition-colors maat:hover:bg-muted"
                >
                  <span className="maat:flex-1">{t.countries[country.code]}</span>
                  <ChevronDown className={cn('maat:size-4 maat:text-muted-foreground maat:transition-transform', isOpen && 'maat:rotate-180')} />
                </button>
                {isOpen && (
                  <ul className="maat:pb-1">
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
      </div>
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
        'maat:flex maat:w-full maat:items-center maat:gap-3 maat:rounded-xl maat:px-3 maat:py-2.5 maat:text-left maat:text-sm maat:transition-colors',
        selected ? 'maat:bg-teal-soft maat:text-teal-deep' : 'maat:hover:bg-muted',
        !language.available && 'maat:cursor-not-allowed maat:opacity-60',
      )}
    >
      {icon}
      <span className="maat:min-w-0 maat:flex-1">
        <span className="maat:block maat:font-medium">{language.name}</span>
        {language.englishName !== language.name && (
          <span className="maat:block maat:text-xs maat:text-muted-foreground">{language.englishName}</span>
        )}
      </span>
      {!language.available ? (
        <span className="maat:rounded-full maat:bg-muted maat:px-2 maat:py-0.5 maat:text-[10px] maat:font-semibold maat:tracking-wide maat:text-muted-foreground maat:uppercase">
          {comingSoon}
        </span>
      ) : (
        selected && <Check className="maat:size-4 maat:text-primary" />
      )}
    </button>
  )
}
