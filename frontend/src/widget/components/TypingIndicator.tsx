import { useLanguage } from '@/i18n'
import { Emblem } from './Emblem'
import { BUBBLE_RING, Tail } from './MessageBubble'

export function TypingIndicator() {
  const { t } = useLanguage()
  return (
    <div className="maat:relative maat:flex maat:pl-9" role="status" aria-label={t.widget.checking}>
      <Emblem size="xs" className="maat-avatar" />
      <div className="maat:relative maat:isolate maat:flex maat:items-center maat:gap-1 maat:rounded-2xl maat:bg-card maat:px-3.5 maat:py-3 maat:ring-1 maat:ring-foreground/10">
        <Tail side="left" ring={BUBBLE_RING} />
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="maat:size-1.5 maat:rounded-full maat:bg-muted-foreground maat:animate-dot maat:motion-reduce:animate-none"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
