import { useCallback, useEffect, useRef, useState } from 'react'
import { getLanguage } from '@/i18n'
import type { MaatClient, Message, Reply } from '../types'

let nextId = 0
const uid = () => `maat-${Date.now().toString(36)}-${(nextId++).toString(36)}`

export function useChat(client: MaatClient) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
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
    async (userMessage: Message, request: (signal: AbortSignal) => Promise<Reply>) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setMessages((prev) => [...prev, userMessage])
      setPending(true)
      try {
        const reply = await request(controller.signal)
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
            ? { id: uid(), role: 'assistant', kind: 'verdict', result: reply, audioUrl, choices: reply.choices }
            : {
                id: uid(),
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
          ...prev.map((m) =>
            m.id === userMessage.id && m.kind === 'voice' && transcript !== undefined ? { ...m, transcript } : m,
          ),
          message,
        ])
      } catch (error) {
        if (controller.signal.aborted) return
        const reason = error instanceof TypeError ? 'network' : 'generic'
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', kind: 'error', reason }])
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
          setPending(false)
        }
      }
    },
    [],
  )

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      void run({ id: uid(), role: 'user', kind: 'text', text: trimmed }, (signal) =>
        client.send(trimmed, { signal, language: getLanguage() }),
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

  return { messages, pending, sendText, sendVoice }
}
