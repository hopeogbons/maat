import { Emblem } from './Emblem'

export function TypingIndicator() {
  return (
    <div className="maat:flex maat:items-end maat:gap-2" aria-label="Maat is checking">
      <Emblem size="xs" className="maat:mb-0.5" />
      <div className="maat:flex maat:items-center maat:gap-1 maat:rounded-2xl maat:rounded-bl-md maat:bg-card maat:px-3.5 maat:py-3 maat:ring-1 maat:ring-foreground/10">
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
