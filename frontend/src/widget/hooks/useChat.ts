import { useCallback, useEffect, useRef, useState } from 'react'
import { getLanguage } from '@/i18n'
import type { MaatClient, Message, Reply, Stage } from '../types'

let nextId = 0
const uid = () => `maat-${Date.now().toString(36)}-${(nextId++).toString(36)}`

export function useChat(client: MaatClient) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  /** What Ma'at is doing right now, while a turn runs and before words arrive. */
  const [stage, setStage] = useState<Stage | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const objectUrls = useRef<string[]>([])

  // Cancel any in-flight request and release voice-note object URLs on unmount.
  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      abortRef.current?.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  const run = useCallback(
    async (
      userMessage: Message,
      request: (signal: AbortSignal, live: { onProgress: (s: Stage) => void; onDelta: (t: string) => void }) => Promise<Reply>,
    ) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setMessages((prev) => [...prev, userMessage])
      setPending(true)
      setStage(null)
      // The reply as it is written: one bubble that grows with each piece,
      // replaced by the finished message when the turn ends. Its id is fixed
      // up front so the final message lands in the same place.
      const draftId = uid()
      const live = {
        onProgress: (next: Stage) => {
          if (!controller.signal.aborted) setStage(next)
        },
        onDelta: (piece: string) => {
          if (controller.signal.aborted || !piece) return
          setMessages((prev) => {
            const draft = prev.find((m) => m.id === draftId)
            if (draft && draft.role === 'assistant' && draft.kind === 'text') {
              return prev.map((m) => (m.id === draftId ? { ...draft, text: draft.text + piece } : m))
            }
            return [...prev, { id: draftId, role: 'assistant', kind: 'text', text: piece, streaming: true }]
          })
        },
      }
      try {
        const reply = await request(controller.signal, live)
        if (controller.signal.aborted) return
        // The spoken reply, when there is one, plays from the bubble. The
        // transcript goes back onto the visitor's own note, so they can see
        // what was heard beside what they said.
        let audioUrl: string | undefined
        if (reply.voice?.audio) {
          audioUrl = URL.createObjectURL(reply.voice.audio)
          objectUrls.current.push(audioUrl)
        }
        const message: Message =
          reply.kind === 'verdict'
            ? { id: draftId, role: 'assistant', kind: 'verdict', result: reply, audioUrl, choices: reply.choices }
            : {
                id: draftId,
                role: 'assistant',
                kind: 'text',
                text: reply.text,
                attachments: reply.attachments,
                audioUrl,
                unheard: reply.voice !== undefined && reply.voice.transcript === '',
                choices: reply.choices,
              }
        const transcript = reply.voice?.transcript
        setMessages((prev) => [
          ...prev
            .filter((m) => m.id !== draftId)
            .map((m) =>
              m.id === userMessage.id && m.kind === 'voice' && transcript !== undefined ? { ...m, transcript } : m,
            ),
          message,
        ])
      } catch (error) {
        if (controller.signal.aborted) return
        const reason = error instanceof TypeError ? 'network' : 'generic'
        setMessages((prev) => [...prev.filter((m) => m.id !== draftId), { id: uid(), role: 'assistant', kind: 'error', reason }])
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setPending(false)
          setStage(null)
        }
      }
    },
    [],
  )

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      void run({ id: uid(), role: 'user', kind: 'text', text: trimmed }, (signal, live) =>
        client.send(trimmed, { signal, language: getLanguage(), ...live }),
      )
    },
    [client, run],
  )

  const sendVoice = useCallback(
    (file: File) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrls.current.push(objectUrl)
      void run({ id: uid(), role: 'user', kind: 'voice', file, objectUrl }, (signal) =>
        client.sendVoice(file, { signal, language: getLanguage() }),
      )
    },
    [client, run],
  )

  return { messages, pending, stage, sendText, sendVoice }
}
