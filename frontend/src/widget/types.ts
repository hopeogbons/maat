import type { AvailableLanguageCode, Verdict } from '@/i18n'

export type { Verdict }

/** A citation to the document behind a verdict. */
export interface Source {
  /** Title of the document, e.g. "Press statement on school calendar". */
  title: string
  /** Issuing body, e.g. "Ministry of Education". This is the citation. */
  issuer: string
  /** ISO 8601 date (YYYY-MM-DD) the document was issued, or "" if unknown. */
  date: string
  /** Link to the original document, or "" for an upload. */
  url: string
  /** The passage Ma’at relied on. */
  quote?: string
  /** Character offsets inside `quote` of the sentence the judgement rests on. */
  highlight?: [number, number] | null
  /** What the passage does to the claim: supports, contradicts, settles_nothing. */
  judgement?: string
}

/** A verdict, with the plain-language answer and the sources behind it. */
export interface VerdictReply {
  kind: 'verdict'
  verdict: Verdict
  answer: string
  sources: Source[]
  confidence?: number
  /** The provider was unavailable and a plain reply stood in. */
  degraded?: boolean
  attachments?: Attachment[]
}

/** A document Ma'at has been cleared to hand over, once the visitor said yes. */
export interface Attachment {
  id: string
  title: string
  issuer: string
  filename: string
  bytes: number
  contentType: string
  /** Where to fetch it. Served by a view that checks the shared flag. */
  url: string
}

/** Conversation: a greeting, a question back, a request for permission. */
export interface TextReply {
  kind: 'text'
  text: string
  attachments?: Attachment[]
}

export type Reply = VerdictReply | TextReply

export interface SendOptions {
  signal?: AbortSignal
  /** Language the visitor is reading in. */
  language?: AvailableLanguageCode
}

/**
 * The only thing the widget needs from the outside world. The API client in
 * apiClient.ts is the real one; the mock rotates through verdicts for demos.
 */
export interface MaatClient {
  send(text: string, options?: SendOptions): Promise<Reply>
  sendVoice(file: File, options?: SendOptions): Promise<Reply>
}

export type Message =
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'user'; kind: 'voice'; file: File; objectUrl: string }
  | { id: string; role: 'assistant'; kind: 'text'; text: string; attachments?: Attachment[] }
  | { id: string; role: 'assistant'; kind: 'verdict'; result: VerdictReply }
  | { id: string; role: 'assistant'; kind: 'error'; reason: 'generic' | 'network' }
