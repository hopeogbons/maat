import { apiFetch } from '@/lib/api'
import type { MaatClient, Reply, SendOptions, Voice } from './types'

interface ChatResponse {
  conversation: string | null
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

interface VoiceChatResponse extends ChatResponse {
  /** The words heard; empty when nothing could be made out. */
  transcript: string
  /** The reply read aloud, or null when the mouth was unavailable. */
  audio: { content_type: string; base64: string } | null
}

function blobOf(audio: VoiceChatResponse['audio']): Blob | null {
  if (!audio?.base64) return null
  const bytes = Uint8Array.from(atob(audio.base64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: audio.content_type })
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

  function replyOf(data: ChatResponse, voice?: Voice): Reply {
    if (data.conversation) conversation = data.conversation
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
        voice,
      }
    }
    return { kind: 'text', text: reply.text, attachments: attachmentsOf(reply), voice }
  }

  async function send(text: string, options?: SendOptions): Promise<Reply> {
    const data = await apiFetch<ChatResponse>('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ text, conversation }),
      signal: options?.signal,
    })
    return replyOf(data)
  }

  /**
   * A voice note goes up as it was recorded and comes back as words and, when
   * the server could speak, as audio. Multipart, so no JSON content type: the
   * browser sets its own boundary.
   */
  async function sendVoice(file: File, options?: SendOptions): Promise<Reply> {
    const body = new FormData()
    body.append('audio', file, file.name)
    if (conversation) body.append('conversation', conversation)
    if (options?.language) body.append('language', options.language)
    const data = await apiFetch<VoiceChatResponse>('/api/chat/voice/', {
      method: 'POST',
      body,
      signal: options?.signal,
    })
    return replyOf(data, { transcript: data.transcript, audio: blobOf(data.audio) })
  }

  return { send, sendVoice }
}
