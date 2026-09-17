import { apiFetch } from '@/lib/api'
import type { MaatClient, Reply, SendOptions } from './types'

interface ChatResponse {
  conversation: string
  reply: {
    kind: 'text' | 'verdict'
    text: string
    verdict?: 'verified' | 'unverified' | 'insufficient' | ''
    confidence?: number
    sources?: Reply extends { sources: infer S } ? S : never
    degraded?: boolean
    attachments?: Record<string, unknown>[]
  }
}

/** The wire shape uses snake_case for one field; everything else lines up. */
function attachmentsOf(reply: { attachments?: Record<string, unknown>[] }) {
  return (reply.attachments ?? []).map((a) => ({
    id: String(a.id ?? ''),
    title: String(a.title ?? ''),
    issuer: String(a.issuer ?? ''),
    filename: String(a.filename ?? ''),
    bytes: Number(a.bytes ?? 0),
    contentType: String(a.content_type ?? ''),
    url: String(a.url ?? ''),
  }))
}

/**
 * The real client. One conversation for as long as the widget is on the page:
 * the messages on screen and the conversation the server continues are the
 * same thing, so a reload starts both afresh. Remembering the id across
 * reloads gave the server a memory the screen did not have, and a visitor
 * saying hello got the answer to what they asked before. Who the visitor is
 * survives regardless, through the visitor cookie.
 */
export function createApiClient(): MaatClient {
  let conversation: string | null = null

  async function send(text: string, options?: SendOptions): Promise<Reply> {
    const data = await apiFetch<ChatResponse>('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ text, conversation }),
      signal: options?.signal,
    })
    conversation = data.conversation
    const { reply } = data
    if (reply.kind === 'verdict' && reply.verdict) {
      return {
        kind: 'verdict',
        verdict: reply.verdict,
        answer: reply.text,
        sources: (reply.sources ?? []) as never,
        confidence: reply.confidence,
        degraded: reply.degraded,
        attachments: attachmentsOf(reply),
      }
    }
    return { kind: 'text', text: reply.text, attachments: attachmentsOf(reply) }
  }

  return {
    send,
    // Voice notes are not transcribed yet. Say so rather than fail silently.
    sendVoice: async () => ({
      kind: 'text',
      text: 'I can’t listen to voice notes just yet. Type what you heard and I’ll check it.',
    }),
  }
}
