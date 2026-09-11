import { useCallback, useEffect, useRef, useState } from 'react'
import { getLanguage } from '@/i18n'
import type { MaatClient, Message, VerifyResult } from '../types'

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
        client.verifyText(trimmed, { signal, language: getLanguage() }),
      )
    },
    [client, run],
  )

  const sendVoice = useCallback(
    (file: File) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrls.current.push(objectUrl)
      void run({ id: uid(), role: 'user', kind: 'voice', file, objectUrl }, (signal) =>
        client.verifyVoice(file, { signal, language: getLanguage() }),
      )
    },
    [client, run],
  )

  return { messages, pending, sendText, sendVoice }
}
