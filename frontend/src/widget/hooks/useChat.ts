import { useCallback, useEffect, useRef, useState } from 'react'
import type { MaatClient, Message, VerifyResult } from '../types'

const GREETING =
  'Hi, I’m Maat. Send me a rumour as text or a voice note and I’ll answer with a verdict and the document it comes from.'

let nextId = 0
const uid = () => `maat-${Date.now().toString(36)}-${(nextId++).toString(36)}`

export function useChat(client: MaatClient) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: uid(), role: 'assistant', kind: 'text', text: GREETING },
  ])
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
    async (userMessage: Message, request: (signal: AbortSignal) => Promise<VerifyResult>) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setMessages((prev) => [...prev, userMessage])
      setPending(true)
      try {
        const result = await request(controller.signal)
        if (controller.signal.aborted) return
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', kind: 'verdict', result }])
      } catch (error) {
        if (controller.signal.aborted) return
        const text =
          error instanceof Error && error.name !== 'TypeError'
            ? 'Maat could not process that just now. Please try again.'
            : 'Maat could not be reached. Check your connection and try again.'
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', kind: 'error', text }])
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
        client.verifyText(trimmed, { signal }),
      )
    },
    [client, run],
  )

  const sendVoice = useCallback(
    (file: File) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrls.current.push(objectUrl)
      void run({ id: uid(), role: 'user', kind: 'voice', file, objectUrl }, (signal) =>
        client.verifyVoice(file, { signal }),
      )
    },
    [client, run],
  )

  return { messages, pending, sendText, sendVoice }
}
