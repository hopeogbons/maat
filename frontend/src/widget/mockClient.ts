import { formatDate, MESSAGES } from '@/i18n'
import type { MaatClient, Reply, SendOptions, Source } from './types'

/**
 * Demo client for showing the widget without a backend. It rotates through
 * the three verdict states so every state can be seen quickly. Sources are
 * sample data; the URLs point at example.org.
 */

const SAMPLE_SOURCES: Record<'verified' | 'unverified', Source> = {
  verified: {
    title: 'Public notice on the revised academic calendar',
    issuer: 'Ministry of Education',
    date: '2026-09-03',
    url: 'https://example.org/notices/2026-09-03-academic-calendar',
    quote: 'The revised academic calendar takes effect from 14 September 2026 for all public schools.',
    highlight: [0, 90],
    judgement: 'supports',
  },
  unverified: {
    title: 'Press statement clarifying reports of a fuel price change',
    issuer: 'Petroleum Regulatory Authority',
    date: '2026-08-28',
    url: 'https://example.org/press/2026-08-28-fuel-price-clarification',
    quote: 'No change to the pump price has been approved. Reports of a 40% increase are not from this authority.',
    highlight: [0, 47],
    judgement: 'contradicts',
  },
}

function excerpt(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function buildReply(index: number, subject: string, options?: SendOptions): Reply {
  const language = options?.language ?? 'en'
  const templates = MESSAGES[language].mock
  switch (index % 3) {
    case 0: {
      const source = SAMPLE_SOURCES.verified
      return {
        kind: 'verdict',
        verdict: 'verified',
        answer: templates.verified(subject, source.issuer, formatDate(source.date, language)),
        sources: [source],
      }
    }
    case 1: {
      const source = SAMPLE_SOURCES.unverified
      return {
        kind: 'verdict',
        verdict: 'unverified',
        answer: templates.unverified(subject, source.issuer, formatDate(source.date, language)),
        sources: [source],
      }
    }
    default:
      return { kind: 'verdict', verdict: 'insufficient', answer: templates.insufficient(subject), sources: [] }
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export interface MockClientOptions {
  /** Simulated network delay in milliseconds. */
  delayMs?: number
}

export function createMockClient({ delayMs = 900 }: MockClientOptions = {}): MaatClient {
  let counter = 0

  async function respond(subject: string, options?: SendOptions): Promise<Reply> {
    await wait(delayMs, options?.signal)
    return buildReply(counter++, subject, options)
  }

  return {
    send: (text, options) => respond(excerpt(text), options),
    sendVoice: (file, options) => respond(file.name, options),
  }
}
