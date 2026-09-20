import type { Verdict } from '@/i18n'

/**
 * One published verification, as `/api/articles/` returns it.
 *
 * The sample articles that used to sit here are gone: the landing page reads
 * the real ones now, and a fixture that looks like a verification is the last
 * thing a verification site should ship.
 */
export interface Article {
  slug: string
  /** The rumour as people share it. */
  title: string
  verdict: Verdict
  summary: string
  /** The whole page, as plain paragraphs separated by blank lines. */
  body: string
  /** Topics from a fixed vocabulary, so filtering gathers rather than scatters. */
  tags: string[]
  /** Absent when nothing in the corpus was cited. */
  source?: { issuer: string; date: string }
  published: string
  readMinutes: number
}
