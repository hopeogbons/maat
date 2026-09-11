import { useAutoScroll } from '../hooks/useAutoScroll'
import type { Message } from '../types'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface MessageListProps {
  messages: Message[]
  pending: boolean
}

export function MessageList({ messages, pending }: MessageListProps) {
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
        {messages.map((message) => (
          <li key={message.id} className="maat:animate-fade-up maat:motion-reduce:animate-none">
            <MessageBubble message={message} />
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
