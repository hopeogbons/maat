/**
 * The document shelf: what Ma'at has read, and what it will accept next.
 *
 * Documents are grouped by the country they speak for. A document with no
 * country is not ungrouped, it is global: a WHO advisory or an IMF release
 * answers a question asked from anywhere, so it sits in its own shelf at the
 * top rather than in a leftovers bin at the bottom.
 */

/**
 * Extensions the upload folder takes: the formats a ministry, a commission or
 * an agency actually publishes in. Nothing else.
 *
 * The list is deliberately short. Ma'at answers claims by quoting a passage
 * back, so a document has to be prose somebody signed and issued. Data formats
 * are a different thing entirely: a spreadsheet or a JSON payload has no
 * passages to quote and no sentence to highlight, and structured data belongs
 * at the API door on the Sources page rather than being dragged in by hand.
 *
 * No .html or .htm either. A stored page is a stored script, and it is the one
 * format on any such list that a browser will execute.
 *
 * Mirrors SUPPORTED_EXTENSIONS on the server, which gates for real; a mismatch
 * here can only refuse a file the server would have taken, never the reverse.
 */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.odt', '.rtf', '.txt'] as const

export function isAcceptedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** The extension without its dot, upper-cased, for the type badge on a row. */
export function fileKind(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? 'FILE' : name.slice(dot + 1).toUpperCase()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** The empty country code, spelled out, so the global shelf is never a typo. */
export const GLOBAL = ''

export interface DocumentRow {
  id: string
  title: string
  filename: string
  /** The publishing body. This is what a citation names. */
  source: string
  /** The publisher's mark beside the document: monogram from short and brand, or its logo. */
  sourceShort?: string
  sourceLogo?: string
  sourceBrand?: string
  /** ISO 3166-1 alpha-2, or GLOBAL for a document that answers from anywhere. */
  country: string
  publishedAt: string
  version: number
  chunks: number
  bytes: number
  status: 'ready' | 'ingesting' | 'failed'
  /**
   * Whether Ma'at may hand this copy to a visitor who asks for it.
   *
   * Off unless somebody says otherwise. A body publishing something openly is
   * not the same as it granting us the right to pass the file on, so this is a
   * decision made per document rather than inferred from the source.
   */
  isPublic: boolean
}

export const DOCUMENTS: DocumentRow[] = [
  {
    id: 'd1',
    title: 'Updated guidance on measles vaccination schedules',
    filename: 'measles-schedule-2026.pdf',
    source: 'World Health Organization',
    country: GLOBAL,
    publishedAt: '2026-08-14',
    version: 2,
    chunks: 184,
    bytes: 2_360_000,
    status: 'ready',
    isPublic: true,
  },
  {
    id: 'd2',
    title: 'World Economic Outlook, July update',
    filename: 'weo-july-2026.pdf',
    source: 'International Monetary Fund',
    country: GLOBAL,
    publishedAt: '2026-07-22',
    version: 1,
    chunks: 412,
    bytes: 8_910_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd3',
    title: 'Commodity price index, monthly series',
    filename: 'commodity-price-index.pdf',
    source: 'World Bank',
    country: GLOBAL,
    publishedAt: '2026-09-01',
    version: 5,
    chunks: 96,
    bytes: 412_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd4',
    title: 'Gazette notice: commencement of the new levy',
    filename: 'gazette-levy-commencement.pdf',
    source: 'Federal Ministry of Finance',
    country: 'NG',
    publishedAt: '2026-08-02',
    version: 1,
    chunks: 38,
    bytes: 640_000,
    status: 'ready',
    isPublic: true,
  },
  {
    id: 'd5',
    title: 'School calendar for the 2026/2027 session',
    filename: 'school-calendar-2026-27.docx',
    source: 'Federal Ministry of Education',
    country: 'NG',
    publishedAt: '2026-07-30',
    version: 3,
    chunks: 24,
    bytes: 118_000,
    status: 'ready',
    isPublic: true,
  },
  {
    id: 'd6',
    title: 'Polling unit register, revised',
    filename: 'polling-unit-register.pdf',
    source: 'Independent National Electoral Commission',
    country: 'NG',
    publishedAt: '2026-09-05',
    version: 1,
    chunks: 0,
    bytes: 3_140_000,
    status: 'ingesting',
    isPublic: false,
  },
  {
    id: 'd7',
    title: 'Public health advisory on cholera',
    filename: 'cholera-advisory.pdf',
    source: 'Ministry of Health',
    country: 'KE',
    publishedAt: '2026-08-19',
    version: 1,
    chunks: 12,
    bytes: 9_800,
    status: 'ready',
    isPublic: true,
  },
  {
    id: 'd8',
    title: 'Fuel subsidy statement',
    filename: 'fuel-subsidy-statement.txt',
    source: 'Ministry of Energy and Petroleum',
    country: 'KE',
    publishedAt: '2026-06-11',
    version: 2,
    chunks: 7,
    bytes: 4_200,
    status: 'failed',
    isPublic: false,
  },
  {
    id: 'd9',
    title: 'Census bulletin, provisional figures',
    filename: 'census-provisional-figures.pdf',
    source: 'Ghana Statistical Service',
    country: 'GH',
    publishedAt: '2026-05-28',
    version: 1,
    chunks: 51,
    bytes: 288_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd10',
    title: 'Global tuberculosis report',
    filename: 'tb-report-2026.pdf',
    source: 'World Health Organization',
    country: GLOBAL,
    publishedAt: '2026-06-30',
    version: 1,
    chunks: 502,
    bytes: 11_200_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd11',
    title: 'Sustainable development goals, indicator tables',
    filename: 'sdg-indicator-report.pdf',
    source: 'United Nations Statistics Division',
    country: GLOBAL,
    publishedAt: '2026-04-18',
    version: 2,
    chunks: 143,
    bytes: 5_400_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd12',
    title: 'International travel health notices',
    filename: 'travel-health-notices.pdf',
    source: 'World Health Organization',
    country: GLOBAL,
    publishedAt: '2026-09-09',
    version: 7,
    chunks: 61,
    bytes: 96_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd13',
    title: 'Food price monitoring bulletin',
    filename: 'food-price-bulletin.pdf',
    source: 'Food and Agriculture Organization',
    country: GLOBAL,
    publishedAt: '2026-08-28',
    version: 4,
    chunks: 88,
    bytes: 730_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd14',
    title: 'Debt sustainability analysis',
    filename: 'debt-analysis.pdf',
    source: 'International Monetary Fund',
    country: GLOBAL,
    publishedAt: '2026-03-12',
    version: 1,
    chunks: 210,
    bytes: 4_100_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd15',
    title: 'Minimum wage review committee report',
    filename: 'minimum-wage-report.pdf',
    source: 'Federal Ministry of Labour and Employment',
    country: 'NG',
    publishedAt: '2026-07-04',
    version: 1,
    chunks: 76,
    bytes: 1_280_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd16',
    title: 'Monetary policy committee communique',
    filename: 'mpc-communique.txt',
    source: 'Central Bank of Nigeria',
    country: 'NG',
    publishedAt: '2026-09-08',
    version: 1,
    chunks: 14,
    bytes: 22_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd17',
    title: 'National immunisation schedule',
    filename: 'immunisation-schedule.docx',
    source: 'Federal Ministry of Health',
    country: 'NG',
    publishedAt: '2026-05-21',
    version: 2,
    chunks: 31,
    bytes: 204_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd18',
    title: 'Petroleum pricing template',
    filename: 'petroleum-pricing-template.pdf',
    source: 'Nigerian Midstream and Downstream Petroleum Regulatory Authority',
    country: 'NG',
    publishedAt: '2026-08-25',
    version: 3,
    chunks: 19,
    bytes: 410_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd19',
    title: 'Examination timetable, senior secondary',
    filename: 'exam-timetable.pdf',
    source: 'West African Examinations Council',
    country: 'NG',
    publishedAt: '2026-02-09',
    version: 1,
    chunks: 9,
    bytes: 88_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd20',
    title: 'Economic survey, quarterly tables',
    filename: 'economic-survey.pdf',
    source: 'Kenya National Bureau of Statistics',
    country: 'KE',
    publishedAt: '2026-07-15',
    version: 1,
    chunks: 64,
    bytes: 520_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd21',
    title: 'Electoral boundaries review',
    filename: 'boundaries-review.pdf',
    source: 'Independent Electoral and Boundaries Commission',
    country: 'KE',
    publishedAt: '2026-04-02',
    version: 1,
    chunks: 118,
    bytes: 2_700_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd22',
    title: 'National curriculum framework',
    filename: 'curriculum-framework.pdf',
    source: 'Ministry of Education',
    country: 'KE',
    publishedAt: '2026-01-30',
    version: 2,
    chunks: 240,
    bytes: 6_300_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd23',
    title: 'Inflation rate bulletin',
    filename: 'inflation-bulletin.pdf',
    source: 'Ghana Statistical Service',
    country: 'GH',
    publishedAt: '2026-09-03',
    version: 9,
    chunks: 43,
    bytes: 150_000,
    status: 'ready',
    isPublic: false,
  },
  {
    id: 'd24',
    title: 'Public sector pay policy',
    filename: 'pay-policy.docx',
    source: 'Ministry of Finance',
    country: 'GH',
    publishedAt: '2026-06-17',
    version: 1,
    chunks: 55,
    bytes: 320_000,
    status: 'ready',
    isPublic: false,
  },
]

export interface Shelf {
  country: string
  documents: DocumentRow[]
  bytes: number
}

/**
 * One shelf per country, global first. Global leads because it applies to every
 * question asked, wherever it came from; the countries follow in the order the
 * caller's country list gives, which is alphabetical by name.
 */
export function shelves(documents: DocumentRow[], order: string[]): Shelf[] {
  const byCountry = new Map<string, DocumentRow[]>()
  for (const doc of documents) {
    byCountry.set(doc.country, [...(byCountry.get(doc.country) ?? []), doc])
  }
  const codes = [GLOBAL, ...order.filter((code) => code !== GLOBAL && byCountry.has(code))]
  // A country holding documents but missing from the reference list would
  // otherwise vanish from the page entirely, taking its documents with it.
  for (const code of byCountry.keys()) {
    if (!codes.includes(code)) codes.push(code)
  }
  return codes
    .filter((code) => byCountry.has(code))
    .map((code) => {
      const docs = (byCountry.get(code) ?? []).slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      return { country: code, documents: docs, bytes: docs.reduce((sum, d) => sum + d.bytes, 0) }
    })
}


/**
 * Free-text match across what somebody would actually search by: the document's
 * title, the file it arrived as, who published it, and the country it is
 * shelved under. The country is in there because the shelf is the only place
 * it appears on screen, and "nigeria health" is a natural thing to type.
 *
 * Case-insensitive, and every word must appear somewhere, so a second word
 * narrows the result rather than widening it.
 */
export function matches(doc: DocumentRow, query: string, country = ''): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = `${doc.title} ${doc.filename} ${doc.source} ${country}`.toLowerCase()
  return words.every((w) => hay.includes(w))
}
