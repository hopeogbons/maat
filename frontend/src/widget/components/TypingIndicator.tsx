import { useLanguage } from '@/i18n'
import type { Stage } from '../types'
import { Emblem } from './Emblem'
import { BUBBLE_RING, Tail } from './MessageBubble'

/**
 * Ma'at at work. The dots alone say "wait"; beside them, when the server is
 * telling us, the stage under way says what for: reading, searching the
 * record, weighing, writing.
 */
export function TypingIndicator({ stage }: { stage?: Stage | null }) {
  const { t } = useLanguage()
  const label = stage ? t.widget.stages[stage] : ''
  return (
    <div className="maat:relative maat:flex maat:pl-9" role="status" aria-label={label || t.widget.checking}>
      <Emblem size="xs" className="maat-avatar" />
      <div className="maat:relative maat:isolate maat:flex maat:items-center maat:gap-2.5 maat:rounded-2xl maat:bg-card maat:px-3.5 maat:py-3 maat:ring-1 maat:ring-foreground/10">
        <Tail side="left" ring={BUBBLE_RING} />
        <span className="maat:flex maat:items-center maat:gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="maat:size-1.5 maat:rounded-full maat:bg-primary/25 maat:animate-dot maat:motion-reduce:animate-none"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </span>
        {label && <span className="maat:text-xs maat:text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}
