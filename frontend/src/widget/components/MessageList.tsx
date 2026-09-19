import { useLanguage } from '@/i18n'
import { useAutoScroll } from '../hooks/useAutoScroll'
import type { Message } from '../types'
import { AssistantBubble, MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: Message[]
  pending: boolean
  /** Sends a tapped answer as if the visitor had typed it. */
  onQuickReply?: (text: string) => void
}

export function MessageList({ messages, pending, onQuickReply }: MessageListProps) {
  const { t } = useLanguage()
  const ref = useAutoScroll<HTMLDivElement>(`${messages.length}:${pending ? 1 : 0}`)

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="maat:flex-1 maat:overflow-y-auto maat:overscroll-contain maat:bg-muted/50 maat:px-3 maat:py-4"
    >
      <ol className="maat:mx-auto maat:flex maat:w-full maat:max-w-2xl maat:flex-col maat:gap-3">
        <li className="maat:animate-fade-up maat:motion-reduce:animate-none">
          <AssistantBubble>
            <p className="maat:whitespace-pre-wrap">{t.widget.greeting}</p>
          </AssistantBubble>
        </li>
        {messages.map((message, i) => (
          <li key={message.id} className="maat:animate-fade-up maat:motion-reduce:animate-none">
            <MessageBubble message={message} onPick={i === messages.length - 1 && !pending ? onQuickReply : undefined} />
          </li>
        ))}
        {pending && (
          <li className="maat:animate-fade-up maat:motion-reduce:animate-none">
            <TypingIndicator />
          </li>
        )}
      </ol>
    </div>
  )
}
