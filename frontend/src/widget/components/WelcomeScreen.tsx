import { cn } from 'cn'
import { ArrowRight, Globe, X } from 'lucide-react'
import { useLanguage, type Verdict } from '@/i18n'
import { Button } from '../ui/button'
import { Emblem } from './Emblem'
import { ExpandToggle } from './ExpandToggle'
import { FloatingIcons } from './FloatingIcons'

interface WelcomeScreenProps {
  expanded: boolean
  onToggleExpand: () => void
  onLanguage: () => void
  onStart: () => void
  onClose: () => void
}

const LEGEND: { verdict: Verdict; dot: string }[] = [
  { verdict: 'verified', dot: 'maat:bg-verified' },
  { verdict: 'unverified', dot: 'maat:bg-unverified' },
  { verdict: 'insufficient', dot: 'maat:bg-insufficient' },
]

export function WelcomeScreen({ expanded, onToggleExpand, onLanguage, onStart, onClose }: WelcomeScreenProps) {
  const { t, language } = useLanguage()
  const headerButton = 'maat:text-primary-foreground/80 maat:hover:bg-white/10 maat:hover:text-primary-foreground'
  return (
    <div className="maat:flex maat:h-full maat:flex-col">
      <div className="maat:relative maat:isolate maat:overflow-hidden maat:bg-[linear-gradient(160deg,var(--teal-deep),var(--primary))] maat:px-6 maat:pt-14 maat:pb-8 maat:text-primary-foreground">
        <FloatingIcons />
        <div className="maat:absolute maat:top-3 maat:right-3 maat:left-3 maat:z-20 maat:flex maat:items-center maat:justify-between maat:gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${t.widget.language}: ${language.name}`}
            onClick={onLanguage}
            className={cn(headerButton, 'maat:gap-1.5 maat:px-2')}
          >
            <Globe />
            {language.name}
          </Button>
          <div className="maat:flex maat:items-center maat:gap-1">
            <ExpandToggle expanded={expanded} onToggle={onToggleExpand} className={headerButton} />
            <Button variant="ghost" size="icon-sm" aria-label={t.widget.close} onClick={onClose} className={headerButton}>
              <X />
            </Button>
          </div>
        </div>
        <div className="maat:relative maat:z-10 maat:mx-auto maat:w-full maat:max-w-xl">
          <Emblem size="lg" />
          <h2 className="maat:mt-4 maat:font-heading maat:text-3xl maat:font-semibold maat:tracking-tight">Ma’at</h2>
          <p className="maat:mt-1 maat:text-base maat:text-primary-foreground/80">{t.widget.tagline}</p>
        </div>
      </div>

      <div className="maat:mx-auto maat:flex maat:w-full maat:max-w-xl maat:flex-1 maat:flex-col maat:justify-between maat:gap-6 maat:px-6 maat:py-6">
        <ul className="maat:flex maat:flex-col maat:gap-3">
          {LEGEND.map(({ verdict, dot }) => (
            <li key={verdict} className="maat:flex maat:gap-3">
              <span aria-hidden="true" className={cn('maat:mt-1.5 maat:size-2.5 maat:shrink-0 maat:rounded-full', dot)} />
              <div>
                <p className="maat:font-medium">{t.verdict[verdict]}</p>
                <p className="maat:text-muted-foreground">{t.widget.legend[verdict]}</p>
              </div>
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          autoFocus
          onClick={onStart}
          className="maat:h-11 maat:w-full maat:rounded-xl maat:bg-gold maat:text-sm maat:font-semibold maat:text-gold-foreground maat:hover:bg-gold/90"
        >
          {t.widget.start}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
