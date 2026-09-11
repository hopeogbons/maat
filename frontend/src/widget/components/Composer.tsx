import { Mic, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface ComposerProps {
  disabled: boolean
  onSendText: (text: string) => void
  onSendVoice: (file: File) => void
}

export function Composer({ disabled, onSendText, onSendVoice }: ComposerProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const canSend = text.trim().length > 0 && !disabled

  // Focus the input when the conversation view opens, and again after a reply.
  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    onSendText(text)
    setText('')
  }

  const pickVoice = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSendVoice(file)
    event.target.value = ''
  }

  return (
    <form onSubmit={submit} className="maat:flex maat:items-center maat:gap-2 maat:border-t maat:border-border maat:bg-background maat:p-3">
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        tabIndex={-1}
        aria-hidden="true"
        onChange={pickVoice}
        className="maat:sr-only"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Upload a voice note"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className="maat:size-9 maat:rounded-full maat:text-primary"
      >
        <Mic />
      </Button>
      <Input
        ref={inputRef}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type a rumour…"
        aria-label="Rumour to verify"
        autoComplete="off"
        disabled={disabled}
        className="maat:h-9 maat:rounded-full maat:bg-muted/60 maat:px-4 maat:text-sm"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send"
        disabled={!canSend}
        className="maat:size-9 maat:rounded-full maat:bg-gold maat:text-gold-foreground maat:hover:bg-gold/90"
      >
        <SendHorizontal />
      </Button>
    </form>
  )
}
