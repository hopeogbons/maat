import { Mic, SendHorizontal, Square, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLanguage } from '@/i18n'
import { useRecorder } from '../hooks/useRecorder'
import { LevelMeter } from './LevelMeter'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface ComposerProps {
  disabled: boolean
  onSendText: (text: string) => void
  onSendVoice: (file: File) => void
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * The composer is one row that changes with what the visitor is doing: a
 * microphone, a text field and send; then a running clock and stop while a
 * note records; then the note itself to listen back to, with delete and send.
 * Nothing is sent until they press send on what they have heard.
 */
export function Composer({ disabled, onSendText, onSendVoice }: ComposerProps) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorder = useRecorder()
  const canSend = text.trim().length > 0 && !disabled

  // Focus the input when the conversation view opens, and again after a reply.
  useEffect(() => {
    if (!disabled && recorder.state === 'idle') inputRef.current?.focus()
  }, [disabled, recorder.state])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    onSendText(text)
    setText('')
  }

  // Browsers that cannot record still get the old door: pick a file.
  const pickVoice = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onSendVoice(file)
    event.target.value = ''
  }

  const sendTake = () => {
    const file = recorder.accept()
    if (file) onSendVoice(file)
  }

  const row = 'maat:mx-auto maat:flex maat:w-full maat:max-w-2xl maat:items-center maat:gap-2'

  return (
    <form onSubmit={submit} className="maat:border-t maat:border-border maat:bg-background maat:p-3">
      {recorder.state === 'recording' && (
        <div className={row} role="status" aria-live="polite">
          <span className="maat:flex maat:h-9 maat:flex-1 maat:items-center maat:gap-3 maat:rounded-full maat:bg-muted/60 maat:px-4 maat:text-sm">
            <span aria-hidden="true" className="maat:size-2.5 maat:shrink-0 maat:animate-pulse maat:rounded-full maat:bg-gold" />
            <span className="maat:sr-only">{t.widget.recording}</span>
            <LevelMeter analyser={recorder.analyser} />
            <span className="maat:tabular-nums maat:text-muted-foreground">{clock(recorder.seconds)}</span>
          </span>
          <Button
            type="button"
            size="icon"
            aria-label={t.widget.stopRecording}
            onClick={recorder.stop}
            className="maat:size-9 maat:rounded-full"
          >
            <Square className="maat:fill-current" />
          </Button>
        </div>
      )}

      {recorder.state === 'preview' && recorder.take && (
        <div className={row}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t.widget.discardRecording}
            disabled={disabled}
            onClick={recorder.discard}
            className="maat:size-9 maat:rounded-full maat:text-muted-foreground"
          >
            <Trash2 />
          </Button>
          <audio
            controls
            preload="metadata"
            src={recorder.take.url}
            aria-label={t.widget.previewRecording}
            className="maat:h-9 maat:min-w-0 maat:flex-1"
          />
          <Button
            type="button"
            size="icon"
            aria-label={t.widget.sendRecording}
            disabled={disabled}
            onClick={sendTake}
            className="maat:size-9 maat:rounded-full maat:bg-gold maat:text-gold-foreground maat:hover:bg-gold/90"
          >
            <SendHorizontal />
          </Button>
        </div>
      )}

      {recorder.state === 'idle' && (
        <div className={row}>
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
            aria-label={recorder.supported ? t.widget.record : t.widget.voiceUpload}
            disabled={disabled}
            onClick={() => (recorder.supported ? void recorder.start() : fileRef.current?.click())}
            className="maat:size-9 maat:rounded-full maat:text-primary"
          >
            <Mic />
          </Button>
          <Input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.widget.placeholder}
            aria-label={t.widget.inputLabel}
            autoComplete="off"
            disabled={disabled}
            className="maat:h-9 maat:rounded-full maat:bg-muted/60 maat:px-4 maat:text-sm"
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t.widget.send}
            disabled={!canSend}
            className="maat:size-9 maat:rounded-full maat:bg-gold maat:text-gold-foreground maat:hover:bg-gold/90"
          >
            <SendHorizontal />
          </Button>
        </div>
      )}

      {recorder.error === 'denied' && (
        <p className="maat:mx-auto maat:mt-2 maat:w-full maat:max-w-2xl maat:px-1 maat:text-xs maat:text-muted-foreground" role="alert">
          {t.widget.micDenied}
        </p>
      )}
    </form>
  )
}
