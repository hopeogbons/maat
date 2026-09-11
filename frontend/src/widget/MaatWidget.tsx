import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChatScreen } from './components/ChatScreen'
import { Launcher } from './components/Launcher'
import { Panel } from './components/Panel'
import { WelcomeScreen } from './components/WelcomeScreen'
import { useChat } from './hooks/useChat'
import { prefersReducedMotion } from './lib/motion'
import { createMockClient } from './mockClient'
import type { MaatClient } from './types'
import './widget.css'

export interface MaatWidgetProps {
  /** Backend adapter. Defaults to a demo client that rotates through verdicts. */
  client?: MaatClient
  /** Render with the panel already open. */
  defaultOpen?: boolean
}

type Phase = 'closed' | 'open' | 'closing'
type View = 'welcome' | 'chat'

const CLOSE_FALLBACK_MS = 320

export function MaatWidget({ client, defaultOpen = false }: MaatWidgetProps) {
  const resolvedClient = useMemo(() => client ?? createMockClient(), [client])
  const chat = useChat(resolvedClient)

  const [phase, setPhase] = useState<Phase>(defaultOpen ? 'open' : 'closed')
  const [view, setView] = useState<View>('welcome')
  const panelId = useId()
  const launcherRef = useRef<HTMLButtonElement>(null)

  const isOpen = phase === 'open'
  const isMounted = phase !== 'closed'

  const open = useCallback(() => setPhase('open'), [])
  const close = useCallback(() => {
    setPhase(prefersReducedMotion() ? 'closed' : 'closing')
    launcherRef.current?.focus()
  }, [])
  const toggle = useCallback(() => (isOpen ? close() : open()), [isOpen, close, open])

  // Safety net in case the exit animation never fires its end event.
  useEffect(() => {
    if (phase !== 'closing') return
    const timer = window.setTimeout(() => setPhase('closed'), CLOSE_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Escape closes the panel.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  return (
    <div className="maat-root">
      <Launcher
        ref={launcherRef}
        open={isOpen}
        panelId={panelId}
        hideWhilePanelShown={isMounted}
        onClick={toggle}
      />
      {isMounted && (
        <Panel
          id={panelId}
          state={isOpen ? 'open' : 'closed'}
          onAnimationEnd={() => {
            if (phase === 'closing') setPhase('closed')
          }}
        >
          {view === 'welcome' ? (
            <WelcomeScreen onStart={() => setView('chat')} onClose={close} />
          ) : (
            <ChatScreen
              messages={chat.messages}
              pending={chat.pending}
              onSendText={chat.sendText}
              onSendVoice={chat.sendVoice}
              onBack={() => setView('welcome')}
              onClose={close}
            />
          )}
        </Panel>
      )}
    </div>
  )
}
