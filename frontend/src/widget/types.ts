import type { AvailableLanguageCode, Verdict } from '@/i18n'

export type { Verdict }

/** A citation to the document that supports the verdict. */
export interface Source {
  /** Title of the document, e.g. "Press statement on school calendar". */
  title: string
  /** Issuing body, e.g. "Ministry of Education". */
  issuer: string
  /** ISO 8601 date (YYYY-MM-DD) the document was issued. */
  date: string
  /** Link to the original document. */
  url: string
}

export interface VerifyResult {
  verdict: Verdict
  /** Plain-language answer shown to the user, in the requested language. */
  answer: string
  /** Present for verified/unverified verdicts; absent when evidence is insufficient. */
  source?: Source
}

export interface VerifyOptions {
  signal?: AbortSignal
  /** Language the user is reading in; the answer should come back in it. */
  language?: AvailableLanguageCode
}

/**
 * The only thing the widget needs from the outside world. Implement this
 * against the Django API and pass it to <MaatWidget client={...} />.
 */
export interface MaatClient {
  verifyText(text: string, options?: VerifyOptions): Promise<VerifyResult>
  verifyVoice(file: File, options?: VerifyOptions): Promise<VerifyResult>
}

export type Message =
  | { id: string; role: 'user'; kind: 'text'; text: string }
  | { id: string; role: 'user'; kind: 'voice'; file: File; objectUrl: string }
  | { id: string; role: 'assistant'; kind: 'verdict'; result: VerifyResult }
  | { id: string; role: 'assistant'; kind: 'error'; reason: 'generic' | 'network' }
