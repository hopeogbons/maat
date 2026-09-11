import type { MaatClient, Source, VerifyOptions, VerifyResult } from './types'

/**
 * Demo client used when no real client is supplied. It rotates through the
 * three verdict states so every state can be seen quickly. Sources are sample
 * data; the URLs point at example.org on purpose.
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

function buildResult(index: number, subject: string): VerifyResult {
  switch (index % 3) {
    case 0: {
      const source = SAMPLE_SOURCES.verified
      return {
        verdict: 'verified',
        answer: `An official record supports this. ${source.issuer} published a notice on 3 September 2026 that confirms the claim about “${subject}” as described. Open the original for the exact wording and any conditions that apply.`,
        source,
      }
    }
    case 1: {
      const source = SAMPLE_SOURCES.unverified
      return {
        verdict: 'unverified',
        answer: `This does not match the official record. ${source.issuer} addressed “${subject}” on 28 August 2026 and its statement contradicts the version that is circulating. Treat the rumour as unconfirmed unless the issuing body says otherwise.`,
        source,
      }
    }
    default:
      return {
        verdict: 'insufficient',
        answer: `I could not find a verified source that addresses “${subject}”. That does not make it false, only unconfirmed.`,
      }
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
    return buildResult(counter++, subject)
  }

  return {
    verifyText: (text, options) => respond(excerpt(text), options),
    verifyVoice: (file, options) => respond(`voice note ${file.name}`, options),
  }
}
