import { CHANNELS, type Channel } from './channels'
import type { Verdict } from './theme'

/**
 * Sample data for the dashboard. Deterministic: a seeded generator, so the
 * numbers are stable across renders and reloads. Replace these functions with
 * calls to the Django API when the endpoints exist; the shapes are the
 * contract the components read.
 */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type RangeKey = '7d' | '30d' | '90d'

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
]

export interface DayRow {
  date: string
  verified: number
  unverified: number
  insufficient: number
}

/** The most recent day the sample covers. Fixed so the sample never drifts. */
const TODAY = new Date('2026-09-13T00:00:00Z')

const ALL_DAYS: DayRow[] = (() => {
  const rand = mulberry32(20260913)
  const rows: DayRow[] = []
  for (let i = 179; i >= 0; i--) {
    const date = new Date(TODAY)
    date.setUTCDate(date.getUTCDate() - i)
    const weekday = date.getUTCDay()
    // Weekends are quieter; volume drifts up slowly over the period.
    const weekend = weekday === 0 || weekday === 6 ? 0.62 : 1
    const drift = 1 + (179 - i) / 320
    const base = 210 * weekend * drift * (0.82 + rand() * 0.36)
    const verified = Math.round(base * (0.44 + rand() * 0.07))
    const unverified = Math.round(base * (0.33 + rand() * 0.06))
    const insufficient = Math.max(4, Math.round(base - verified - unverified))
    rows.push({ date: date.toISOString().slice(0, 10), verified, unverified, insufficient })
  }
  return rows
})()

export function daysFor(range: RangeKey): DayRow[] {
  const days = RANGES.find((r) => r.key === range)!.days
  return ALL_DAYS.slice(-days)
}

/** The same window immediately before the selected one, for period-on-period deltas. */
export function previousDaysFor(range: RangeKey): DayRow[] {
  const days = RANGES.find((r) => r.key === range)!.days
  return ALL_DAYS.slice(-days * 2, -days)
}

export const total = (rows: DayRow[]): number =>
  rows.reduce((sum, r) => sum + r.verified + r.unverified + r.insufficient, 0)

export const totalBy = (rows: DayRow[], verdict: Verdict): number =>
  rows.reduce((sum, r) => sum + r[verdict], 0)

/** Median minutes to a verdict, one value per day in the window. */
export function medianMinutes(range: RangeKey): number[] {
  const rand = mulberry32(range === '7d' ? 71 : range === '30d' ? 302 : 903)
  const days = RANGES.find((r) => r.key === range)!.days
  return Array.from({ length: days }, (_, i) => {
    const improving = 5.6 - (i / days) * 1.9
    return +(improving + (rand() - 0.5) * 0.8).toFixed(2)
  })
}

/** Weekly volume per arrival channel: four series that are the subject. */
export function channelSeries(range: RangeKey): { name: Channel; data: number[] }[] {
  const weeks = range === '7d' ? 4 : range === '30d' ? 8 : 12
  const rand = mulberry32(4417)
  const shape: Record<Channel, [number, number]> = {
    WhatsApp: [430, 1.055],
    'Voice note': [180, 1.085],
    X: [150, 1.02],
    Facebook: [96, 0.995],
  }
  return CHANNELS.map((name) => {
    const [start, growth] = shape[name]
    return {
      name,
      data: Array.from({ length: weeks }, (_, i) =>
        Math.round(start * growth ** i * (0.94 + rand() * 0.12)),
      ),
    }
  })
}

export function channelWeekLabels(range: RangeKey): string[] {
  const weeks = range === '7d' ? 4 : range === '30d' ? 8 : 12
  return Array.from({ length: weeks }, (_, i) => `W${i + 1}`)
}

export interface Issuer {
  name: string
  citations: number
}

export function issuers(range: RangeKey): Issuer[] {
  const scale = range === '7d' ? 0.24 : range === '30d' ? 1 : 3.1
  return [
    { name: 'Ministry of Health', citations: 412 },
    { name: 'Ministry of Education', citations: 361 },
    { name: 'Electoral Commission', citations: 288 },
    { name: 'Petroleum Regulatory Authority', citations: 244 },
    { name: 'Police Headquarters', citations: 190 },
    { name: 'Federal Roads Agency', citations: 151 },
    { name: 'National Scholarship Board', citations: 118 },
  ].map((r) => ({ ...r, citations: Math.round(r.citations * scale) }))
}

export const HOUR_BUCKETS = ['00–03', '03–06', '06–09', '09–12', '12–15', '15–18', '18–21', '21–24']
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Arrivals by weekday and three-hour bucket: one magnitude per cell. */
export function arrivals(range: RangeKey): { day: string; values: number[] }[] {
  const scale = range === '7d' ? 0.25 : range === '30d' ? 1 : 3
  const rand = mulberry32(881)
  // Mornings and early evenings are busiest; nights are quiet.
  const shape = [0.12, 0.08, 0.62, 1, 0.88, 0.84, 0.96, 0.44]
  return WEEKDAYS.map((day, d) => {
    const weekend = d >= 5 ? 0.66 : 1
    return {
      day,
      values: shape.map((s) => Math.round(96 * s * weekend * scale * (0.85 + rand() * 0.3))),
    }
  })
}

export interface Verification {
  id: string
  claim: string
  verdict: Verdict
  issuer?: string
  language: string
  channel: Channel
  minutes: number
}

export const LATEST: Verification[] = [
  {
    id: 'v-4821',
    claim: 'Free malaria vaccine rollout starts next week in every state',
    verdict: 'verified',
    issuer: 'Ministry of Health',
    language: 'Kiswahili',
    channel: 'WhatsApp',
    minutes: 2.4,
  },
  {
    id: 'v-4820',
    claim: 'Nationwide curfew announced from 10pm tonight',
    verdict: 'unverified',
    issuer: 'Police Headquarters',
    language: 'Hausa',
    channel: 'X',
    minutes: 1.9,
  },
  {
    id: 'v-4819',
    claim: 'A new 5% levy now applies to every mobile money transfer',
    verdict: 'insufficient',
    language: 'Naijá',
    channel: 'Voice note',
    minutes: 6.1,
  },
  {
    id: 'v-4818',
    claim: 'Voter registration deadline extended by two weeks',
    verdict: 'verified',
    issuer: 'Electoral Commission',
    language: 'English',
    channel: 'WhatsApp',
    minutes: 3.2,
  },
  {
    id: 'v-4817',
    claim: 'Fuel price goes up by 40% on Monday',
    verdict: 'unverified',
    issuer: 'Petroleum Regulatory Authority',
    language: 'Yorùbá',
    channel: 'Facebook',
    minutes: 2.8,
  },
  {
    id: 'v-4816',
    claim: 'Passport fees doubled with immediate effect',
    verdict: 'insufficient',
    language: 'Igbo',
    channel: 'X',
    minutes: 5.4,
  },
  {
    id: 'v-4815',
    claim: 'The bridge on the East Road is closed for six months',
    verdict: 'verified',
    issuer: 'Federal Roads Agency',
    language: 'English',
    channel: 'Voice note',
    minutes: 4.0,
  },
]

export const LANGUAGE_SHARE = [
  { name: 'English', share: 31.4 },
  { name: 'Hausa', share: 22.8 },
  { name: 'Kiswahili', share: 18.1 },
  { name: 'Naijá', share: 12.6 },
  { name: 'Yorùbá', share: 9.3 },
  { name: 'Igbo', share: 5.8 },
]
