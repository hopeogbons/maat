import { formatDate, MESSAGES } from '@/i18n'
import type { MaatClient, Source, VerifyOptions, VerifyResult } from './types'

/**
 * Demo client used when no real client is supplied. It rotates through the
 * three verdict states so every state can be seen quickly, answering in the
 * requested language. Sources are sample data; the URLs point at example.org.
 */

const SAMPLE_SOURCES: Record<'verified' | 'unverified', Source> = {
  verified: {
    title: 'Public notice on the revised academic calendar',
    issuer: 'Ministry of Education',
    date: '2026-09-03',
    url: 'https://example.org/notices/2026-09-03-academic-calendar',
  },
  unverified: {
    title: 'Press statement clarifying reports of a fuel price change',
    issuer: 'Petroleum Regulatory Authority',
    date: '2026-08-28',
    url: 'https://example.org/press/2026-08-28-fuel-price-clarification',
  },
}

function excerpt(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function buildResult(index: number, subject: string, options?: VerifyOptions): VerifyResult {
  const language = options?.language ?? 'en'
  const templates = MESSAGES[language].mock
  switch (index % 3) {
    case 0: {
      const source = SAMPLE_SOURCES.verified
      return {
        verdict: 'verified',
        answer: templates.verified(subject, source.issuer, formatDate(source.date, language)),
        source,
      }
    }
    case 1: {
      const source = SAMPLE_SOURCES.unverified
      return {
        verdict: 'unverified',
        answer: templates.unverified(subject, source.issuer, formatDate(source.date, language)),
        source,
      }
    }
    default:
      return { verdict: 'insufficient', answer: templates.insufficient(subject) }
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

  async function respond(subject: string, options?: VerifyOptions): Promise<VerifyResult> {
    await wait(delayMs, options?.signal)
    return buildResult(counter++, subject, options)
  }

  return {
    verifyText: (text, options) => respond(excerpt(text), options),
    verifyVoice: (file, options) => respond(file.name, options),
  }
}
