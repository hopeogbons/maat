import type { AvailableLanguageCode, Verdict } from '@/i18n'

export type { Verdict }

/** What a publisher's mark needs: the same four fields the dashboard draws from. */
export interface SourceMarkInfo {
  name: string
  /** Short form for the monogram, e.g. "NAN"; derived from the name when empty. */
  short: string
  /** The body's own logo, when it has one that can be served. */
  logoUrl: string
  /** Brand colour for the monogram, as CSS. */
  brand: string
}

/** A citation to the document behind a verdict. */
export interface Source {
  /** Title of the document, e.g. "Press statement on school calendar". */
  title: string
  /** Issuing body, e.g. "Ministry of Education". This is the citation. */
  issuer: string
  /** The issuing body's mark, when the document came from a configured source. */
  source?: SourceMarkInfo | null
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

/**
 * What came back with a voice note: the words Ma'at heard, so a mishearing is
 * visible, and the reply read aloud, when the mouth was available.
 */
export interface Voice {
  transcript: string
  audio: Blob | null
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
  voice?: Voice
  choices?: Choice[]
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

/** A one-tap answer to a question the reply asks. `send` goes back as if typed. */
export interface Choice {
  kind: 'yes' | 'no' | string
  send: string
}

/** Conversation: a greeting, a question back, a request for permission. */
export interface TextReply {
  kind: 'text'
  text: string
  attachments?: Attachment[]
  voice?: Voice
  choices?: Choice[]
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
  | { id: string; role: 'user'; kind: 'voice'; file: File; objectUrl: string; transcript?: string }
  | {
      id: string
      role: 'assistant'
      kind: 'text'
      text: string
      attachments?: Attachment[]
      audioUrl?: string
      /** A voice note came back with no words heard: the bubble says so in the visitor's language. */
      unheard?: boolean
      choices?: Choice[]
    }
  | { id: string; role: 'assistant'; kind: 'verdict'; result: VerdictReply; audioUrl?: string; choices?: Choice[] }
  | { id: string; role: 'assistant'; kind: 'error'; reason: 'generic' | 'network' }
