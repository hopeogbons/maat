import { cn } from 'cn'
import { ArrowRight, X } from 'lucide-react'
import { Button } from '../ui/button'
import { VERDICT_LABEL, type Verdict } from '../types'
import { Emblem } from './Emblem'
import { ExpandToggle } from './ExpandToggle'

interface WelcomeScreenProps {
  expanded: boolean
  onToggleExpand: () => void
  onStart: () => void
  onClose: () => void
}

const LEGEND: { verdict: Verdict; text: string; dot: string }[] = [
  { verdict: 'verified', text: 'Backed by an official document you can open.', dot: 'maat:bg-verified' },
  { verdict: 'unverified', text: 'The official record contradicts the rumour.', dot: 'maat:bg-unverified' },
  { verdict: 'insufficient', text: 'No verified source found, so Maat says so rather than guess.', dot: 'maat:bg-insufficient' },
]

export function WelcomeScreen({ expanded, onToggleExpand, onStart, onClose }: WelcomeScreenProps) {
  const headerButton = 'maat:text-primary-foreground/80 maat:hover:bg-white/10 maat:hover:text-primary-foreground'
  return (
    <div className="maat:flex maat:h-full maat:flex-col">
      <div className="maat:relative maat:bg-[linear-gradient(160deg,var(--teal-deep),var(--primary))] maat:px-6 maat:pt-14 maat:pb-8 maat:text-primary-foreground">
        <div className="maat:absolute maat:top-3 maat:right-3 maat:flex maat:items-center maat:gap-1">
          <ExpandToggle expanded={expanded} onToggle={onToggleExpand} className={headerButton} />
          <Button variant="ghost" size="icon-sm" aria-label="Close Maat" onClick={onClose} className={headerButton}>
            <X />
          </Button>
        </div>
        <div className="maat:mx-auto maat:w-full maat:max-w-xl">
          <Emblem size="lg" />
          <h2 className="maat:mt-4 maat:font-heading maat:text-3xl maat:font-semibold maat:tracking-tight">Maat</h2>
          <p className="maat:mt-1 maat:text-base maat:text-primary-foreground/80">Send a rumour, get a cited answer</p>
        </div>
      </div>

      <div className="maat:mx-auto maat:flex maat:w-full maat:max-w-xl maat:flex-1 maat:flex-col maat:justify-between maat:gap-6 maat:px-6 maat:py-6">
        <ul className="maat:flex maat:flex-col maat:gap-3">
          {LEGEND.map(({ verdict, text, dot }) => (
            <li key={verdict} className="maat:flex maat:gap-3">
              <span aria-hidden="true" className={cn('maat:mt-1.5 maat:size-2.5 maat:shrink-0 maat:rounded-full', dot)} />
              <div>
                <p className="maat:font-medium">{VERDICT_LABEL[verdict]}</p>
                <p className="maat:text-muted-foreground">{text}</p>
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
          Start a conversation
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
