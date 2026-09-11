import { ArrowLeft, X } from 'lucide-react'
import { Button } from '../ui/button'
import type { Message } from '../types'
import { Composer } from './Composer'
import { Emblem } from './Emblem'
import { ExpandToggle } from './ExpandToggle'
import { MessageList } from './MessageList'

interface ChatScreenProps {
  messages: Message[]
  pending: boolean
  onSendText: (text: string) => void
  onSendVoice: (file: File) => void
  expanded: boolean
  onToggleExpand: () => void
  onBack: () => void
  onClose: () => void
}

export function ChatScreen({
  messages,
  pending,
  onSendText,
  onSendVoice,
  expanded,
  onToggleExpand,
  onBack,
  onClose,
}: ChatScreenProps) {
  const headerButton =
    'maat:text-primary-foreground/80 maat:hover:bg-white/10 maat:hover:text-primary-foreground'

  return (
    <div className="maat:flex maat:h-full maat:flex-col">
      <header className="maat:flex maat:items-center maat:gap-2 maat:bg-primary maat:px-2 maat:py-2.5 maat:text-primary-foreground">
        <Button variant="ghost" size="icon-sm" aria-label="Back to welcome" onClick={onBack} className={headerButton}>
          <ArrowLeft />
        </Button>
        <Emblem size="sm" />
        <div className="maat:min-w-0 maat:flex-1">
          <p className="maat:font-heading maat:text-sm maat:leading-tight maat:font-semibold">Maat</p>
          <p className="maat:text-xs maat:text-primary-foreground/70">Rumour verification</p>
        </div>
        <ExpandToggle expanded={expanded} onToggle={onToggleExpand} className={headerButton} />
        <Button variant="ghost" size="icon-sm" aria-label="Close Maat" onClick={onClose} className={headerButton}>
          <X />
        </Button>
      </header>

      <MessageList messages={messages} pending={pending} />

      <Composer disabled={pending} onSendText={onSendText} onSendVoice={onSendVoice} />
    </div>
  )
}
