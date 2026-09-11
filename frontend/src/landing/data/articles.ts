export type Verdict = 'verified' | 'unverified' | 'insufficient'

export const VERDICT_LABEL: Record<Verdict, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  insufficient: 'Insufficient evidence',
}

export interface Article {
  slug: string
  /** The rumour as people share it. */
  title: string
  verdict: Verdict
  summary: string
  tags: string[]
  /** Absent when the verdict is "insufficient evidence". */
  source?: { issuer: string; date: string }
  published: string
  readMinutes: number
}

/**
 * Sample verifications for the landing page. Fictional claims and generic
 * issuing bodies, kept plausible so the layout reads like the real product.
 */
export const ARTICLES: Article[] = [
  {
    slug: 'schools-closed-until-november',
    title: 'Public schools will stay closed until November',
    verdict: 'unverified',
    summary:
      'The circular going round on WhatsApp is not the one the ministry issued. The published calendar resumes classes on 15 September, with no closure in October.',
    tags: ['Education', 'Schools'],
    source: { issuer: 'Ministry of Education', date: '2026-09-03' },
    published: '2026-09-04',
    readMinutes: 3,
  },
  {
    slug: 'malaria-vaccine-rollout',
    title: 'Free malaria vaccine rollout starts next week in every state',
    verdict: 'verified',
    summary:
      'A press statement confirms the first phase begins on 14 September at primary health centres, free of charge for children under five.',
    tags: ['Health', 'Vaccines'],
    source: { issuer: 'Ministry of Health', date: '2026-09-01' },
    published: '2026-09-02',
    readMinutes: 2,
  },
  {
    slug: 'fuel-price-forty-percent',
    title: 'Fuel price goes up by 40% on Monday',
    verdict: 'unverified',
    summary:
      'The regulator addressed the claim directly and published the current approved price band. No increase of that size has been gazetted.',
    tags: ['Economy', 'Fuel'],
    source: { issuer: 'Petroleum Regulatory Authority', date: '2026-08-28' },
    published: '2026-08-29',
    readMinutes: 3,
  },
  {
    slug: 'voter-registration-extended',
    title: 'Voter registration deadline extended by two weeks',
    verdict: 'verified',
    summary:
      'The commission announced the extension in a signed notice. Registration now closes on 30 September at all designated centres.',
    tags: ['Elections', 'Civic'],
    source: { issuer: 'Electoral Commission', date: '2026-08-30' },
    published: '2026-08-31',
    readMinutes: 2,
  },
  {
    slug: 'mobile-money-levy',
    title: 'A new 5% levy now applies to every mobile money transfer',
    verdict: 'insufficient',
    summary:
      'We found no gazette, circular or statement from the revenue service or the central bank that introduces such a levy. That does not make it false, only unconfirmed.',
    tags: ['Economy', 'Tax', 'Banking'],
    published: '2026-09-05',
    readMinutes: 2,
  },
  {
    slug: 'nationwide-curfew',
    title: 'Nationwide curfew announced from 10pm tonight',
    verdict: 'unverified',
    summary:
      'Police headquarters issued a statement describing the message as false. No curfew order has been published by any state or federal authority.',
    tags: ['Security', 'Viral'],
    source: { issuer: 'Police Headquarters', date: '2026-09-05' },
    published: '2026-09-05',
    readMinutes: 2,
  },
  {
    slug: 'scholarship-portal-opens',
    title: 'Scholarship portal opens for 20,000 undergraduate students',
    verdict: 'verified',
    summary:
      'The board published the call for applications with eligibility criteria and a closing date of 31 October. The portal address in the notice matches the one being shared.',
    tags: ['Education', 'Scholarships'],
    source: { issuer: 'National Scholarship Board', date: '2026-09-04' },
    published: '2026-09-06',
    readMinutes: 3,
  },
  {
    slug: 'passport-fees-doubled',
    title: 'Passport fees doubled with immediate effect',
    verdict: 'insufficient',
    summary:
      'The immigration service has not published a new fee schedule and its current price list is unchanged. We could not confirm or rule out a pending change.',
    tags: ['Travel', 'Fees'],
    published: '2026-09-07',
    readMinutes: 2,
  },
  {
    slug: 'east-road-bridge-closure',
    title: 'The bridge on the East Road is closed for six months',
    verdict: 'verified',
    summary:
      'A public notice confirms the closure for rehabilitation from 8 September, with the diversion route mapped in the same document.',
    tags: ['Transport', 'Infrastructure'],
    source: { issuer: 'Federal Roads Agency', date: '2026-09-06' },
    published: '2026-09-08',
    readMinutes: 2,
  },
]

export const ALL_TAGS: string[] = [...new Set(ARTICLES.flatMap((a) => a.tags))].sort()

export const TRENDING_TAGS = [
  'Fuel price',
  'School calendar',
  'Vaccines',
  'Voter registration',
  'New tax',
  'Curfew',
  'Scholarships',
  'Passport fees',
  'Exchange rate',
  'Recruitment',
  'Flooding',
  'Bridge closure',
  'Minimum wage',
  'Exam dates',
]
