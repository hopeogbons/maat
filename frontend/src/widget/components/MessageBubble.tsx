import { AudioLines, CircleDashed } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLanguage } from '@/i18n'
import { formatBytes } from '../lib/format'
import type { Message } from '../types'
import { Emblem } from './Emblem'
import { VerdictCard } from './VerdictCard'

/** Left-aligned bubble with the Maat mark, for plain assistant text. */
export function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="maat:flex maat:items-end maat:gap-2">
      <Emblem size="xs" className="maat:mb-0.5" />
      <div className="maat:max-w-[90%] maat:rounded-2xl maat:rounded-bl-md maat:bg-card maat:px-3.5 maat:py-2 maat:text-sm maat:text-card-foreground maat:ring-1 maat:ring-foreground/10">
        {children}
      </div>
    </div>
  )
}

export function MessageBubble({ message }: { message: Message }) {
  const { t } = useLanguage()

  if (message.role === 'user') {
    return (
      <div className="maat:flex maat:justify-end">
        <div className="maat:max-w-[85%] maat:rounded-2xl maat:rounded-br-md maat:bg-primary maat:px-3.5 maat:py-2 maat:text-sm maat:text-primary-foreground">
          {message.kind === 'text' ? (
            <p className="maat:whitespace-pre-wrap maat:break-words">{message.text}</p>
          ) : (
            <div>
              <div className="maat:flex maat:items-center maat:gap-2">
                <AudioLines className="maat:size-4 maat:shrink-0 maat:text-gold" />
                <div className="maat:min-w-0">
                  <p className="maat:font-medium">{t.widget.voiceNote}</p>
                  <p className="maat:truncate maat:text-xs maat:text-primary-foreground/70">
                    {message.file.name} · {formatBytes(message.file.size)}
                  </p>
                </div>
              </div>
              <audio controls preload="metadata" src={message.objectUrl} className="maat:mt-2 maat:h-8 maat:w-full maat:min-w-56" />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (message.kind === 'verdict') {
    return (
      <div className="maat:flex maat:items-end maat:gap-2">
        <Emblem size="xs" className="maat:mb-0.5" />
        <div className="maat:min-w-0 maat:flex-1">
          <VerdictCard result={message.result} />
        </div>
      </div>
    )
  }

  return (
    <AssistantBubble>
      <p className="maat:flex maat:items-start maat:gap-2 maat:text-muted-foreground">
        <CircleDashed className="maat:mt-0.5 maat:size-4 maat:shrink-0" />
        <span>{message.reason === 'network' ? t.widget.errorNetwork : t.widget.errorGeneric}</span>
      </p>
    </AssistantBubble>
  )
}
