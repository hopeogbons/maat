/**
 * The source register: the bodies whose word Ma'at will repeat, and the door
 * each one's publications arrive by.
 *
 * Four doors, taken in order of preference. A public API the body offers,
 * because it is structured and complete. A feed it maintains. Its own public
 * pages, for the official bodies that publish neither: a national emergency
 * agency, a ministry, a public broadcaster, whose word is exactly what a
 * rumour must be checked against and who offer no other way to read it. And
 * files added by hand, which is also the door Ma'at's own publications come
 * in by.
 *
 * The pages door is for official and public-interest bodies only, never a
 * private outlet, and it is read as a good citizen: the site's robots rules
 * first, slowly, identified, whole articles only, and never from behind a
 * login or a paywall. The server enforces every one of those.
 */

import type { LucideIcon } from 'lucide-react'
import { Globe, Plug, Rss, UploadCloud } from 'lucide-react'

export type Door = 'upload' | 'feed' | 'api' | 'pages'

export interface DoorSpec {
  label: string
  icon: LucideIcon
  /** What this door is, in one line, for somebody choosing between them. */
  blurb: string
  /** What the source must give us before the door can be opened. */
  needs: 'nothing' | 'feed-url' | 'api-url' | 'page-url'
  /** Tailwind classes for the badge: tint, text, ring. */
  tone: string
}

export const DOORS: Record<Door, DoorSpec> = {
  upload: {
    label: 'Direct upload',
    icon: UploadCloud,
    blurb: 'Staff add the files by hand. For bodies that publish no feed and run no API.',
    needs: 'nothing',
    tone: 'bg-teal-soft text-teal ring-teal/20',
  },
  feed: {
    label: 'RSS or Atom feed',
    icon: Rss,
    blurb: 'A feed the body publishes, polled on a schedule. New entries are fetched and read.',
    needs: 'feed-url',
    tone: 'bg-gold-soft text-gold-dark ring-gold/30',
  },
  api: {
    label: 'Public API',
    icon: Plug,
    blurb: 'A documented endpoint the body offers openly. Structured, and the most reliable door.',
    needs: 'api-url',
    tone: 'bg-[oklch(0.95_0.03_300)] text-[oklch(0.45_0.15_300)] ring-[oklch(0.45_0.15_300)]/20',
  },
  pages: {
    label: 'Public web pages',
    icon: Globe,
    blurb: 'An official body’s own news pages, read where it offers neither API nor feed. Whole articles, by its robots rules, slowly.',
    needs: 'page-url',
    tone: 'bg-[oklch(0.95_0.04_150)] text-[oklch(0.42_0.12_150)] ring-[oklch(0.42_0.12_150)]/20',
  },
}

/**
 * How reliable the address itself is, which is a different question from
 * whether the last fetch worked. Taken from the trusted sources specification.
 */
export type Verification = 'tested' | 'documented' | 'listed'

export const VERIFICATION: Record<Verification, { label: string; note: string; tone: string }> = {
  tested: {
    label: 'Tested',
    note: 'Fetched live and returned valid data.',
    tone: 'bg-verified-soft text-verified ring-verified/25',
  },
  documented: {
    label: 'Documented',
    note: 'Official published API, maintained by the body.',
    tone: 'bg-teal-soft text-teal ring-teal/25',
  },
  listed: {
    label: 'Needs a check',
    note: 'Published on an official index but not fetched yet. Validate before first use.',
    tone: 'bg-unverified-soft text-unverified ring-unverified/25',
  },
}

/**
 * What a country code does to a source, which is not the same as where the
 * body sits. The World Bank is a global organisation whose API takes a
 * country; WHO AFRO's feed is global and takes nothing, so a question about
 * Kenya means filtering its items by hand.
 */
export type Scope = 'general' | 'by-country' | 'national'

export const SCOPE: Record<Scope, { label: string; note: string }> = {
  general: { label: 'Global feed', note: 'Covers everywhere at once. Items are filtered by country afterwards.' },
  'by-country': { label: 'Global, by country', note: 'Takes a country code and answers for that country.' },
  national: { label: 'National', note: 'Belongs to one country and covers only it.' },
}

export interface SourceRow {
  id: string
  name: string
  /** Short form for the monogram when no logo loads. */
  short: string
  /** Where the body's own mark lives. Empty falls back to a monogram. */
  logoUrl: string
  door: Door
  /** Feed or API address. Empty for upload, which has no address. */
  address: string
  /** What the API returns or the feed carries, in the body's own words. */
  collection: string
  /** ISO 3166-1 alpha-2, or '' for a body whose word applies anywhere. */
  country: string
  /** How often the door is checked. Zero for upload, which is not polled. */
  cadenceMinutes: number
  isActive: boolean
  /** ISO timestamp, or '' if never. */
  lastPolledAt: string
  documents: number
  health: 'ok' | 'never' | 'failing'
  /** True for Ma'at itself: first in the list, and not removable. */
  isDefault?: boolean
  /** What a country code does to this source. */
  scope: Scope
  /** How far the address itself has been verified. */
  verification: Verification
  /** Health, statistics, humanitarian: what it is a source of. */
  subject: string
  /** An API asked when a claim needs a figure, never polled. Health means something else for it. */
  onDemand?: boolean
  /** The body's own colour, for its monogram. Their logos are trademarks and
   *  their favicons are unreliable, so a monogram in their own colour is the
   *  identifier that always renders. Set logoUrl to override with a real one. */
  brand: string
}

/**
 * Ma'at is its own first source, and the default.
 *
 * Partly because Ma'at publishes: its own notices are answerable knowledge like
 * anyone else's. Mostly because a source carries the mark shown beside every
 * citation, every avatar and every article by-line, so Ma'at having a source
 * record is what makes its own mark follow it everywhere the others' do,
 * through one code path rather than two.
 */
export const MAAT: SourceRow = {
  id: 'maat',
  name: 'Ma’at',
  short: 'MA',
  // Empty on purpose: the emblem is drawn, not fetched, so it is always
  // available and always on brand. Set a URL here to override it.
  logoUrl: '',
  door: 'upload',
  address: '',
  collection: 'Ma’at’s own notices, corrections and published articles',
  country: '',
  cadenceMinutes: 0,
  isActive: true,
  lastPolledAt: '',
  documents: 0,
  health: 'never',
  isDefault: true,
  scope: 'general',
  verification: 'tested',
  subject: 'Ma’at’s own record',
  brand: '#C9A227',
}

const SEED: SourceRow[] = [
  MAAT,
  {
    id: "world-bank-ng",
    name: "World Bank",
    short: "WB",
    logoUrl: "/sources/worldbank.png",
    door: "api",
    address: "https://api.worldbank.org/v2/country/NGA/indicator/",
    collection: "Indicators for Nigeria: economy, population, health",
    country: "NG",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Statistics",
    brand: "#002244",
  },
  {
    id: "who-gho-ng",
    name: "WHO Global Health Observatory",
    short: "GHO",
    logoUrl: "/sources/who.png",
    door: "api",
    address: "https://ghoapi.azureedge.net/api/?$filter=SpatialDim eq 'NGA'",
    collection: "Health statistics for Nigeria: mortality, immunisation, disease burden",
    country: "NG",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Health",
    brand: "#0093D5",
  },
  {
    id: "hdx-ng",
    name: "Humanitarian Data Exchange",
    short: "HDX",
    logoUrl: "/sources/hdx.png",
    door: "api",
    address: "https://data.humdata.org/api/3/action/package_search?fq=groups:nga",
    collection: "Datasets filed under Nigeria by WFP, WHO, UNHCR, IOM and NGOs",
    country: "NG",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Humanitarian",
    brand: "#007CE0",
  },
  {
    id: "unhcr-ng",
    name: "UNHCR",
    short: "UNH",
    logoUrl: "/sources/unhcr.png",
    door: "api",
    address: "https://api.unhcr.org/population/v1/population/?coa=NGA",
    collection: "Refugees and displaced people hosted in Nigeria, and those who left it",
    country: "NG",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Displacement",
    brand: "#0072BC",
  },
  {
    id: "unicef-ng",
    name: "UNICEF Data Warehouse",
    short: "UNI",
    logoUrl: "/sources/unicef.png",
    door: "api",
    address: "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/data/UNICEF,GLOBAL_DATAFLOW,1.0/NGA./",
    collection: "Child health, education, nutrition and water for Nigeria",
    country: "NG",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Children",
    brand: "#1CABE2",
  },
  {
    id: "owid-ng",
    name: "Our World in Data",
    short: "OWID",
    logoUrl: "/sources/owid.png",
    door: "api",
    address: "https://ourworldindata.org/grapher/?csvType=filtered&country=NGA",
    collection: "Curated indicators for Nigeria, each citing its own source",
    country: "NG",
    cadenceMinutes: 10080,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Statistics",
    brand: "#B13507",
  },
  {
    id: "world-bank-ke",
    name: "World Bank",
    short: "WB",
    logoUrl: "/sources/worldbank.png",
    door: "api",
    address: "https://api.worldbank.org/v2/country/KEN/indicator/",
    collection: "Indicators for Kenya: economy, population, health",
    country: "KE",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Statistics",
    brand: "#002244",
  },
  {
    id: "who-gho-ke",
    name: "WHO Global Health Observatory",
    short: "GHO",
    logoUrl: "/sources/who.png",
    door: "api",
    address: "https://ghoapi.azureedge.net/api/?$filter=SpatialDim eq 'KEN'",
    collection: "Health statistics for Kenya: mortality, immunisation, disease burden",
    country: "KE",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Health",
    brand: "#0093D5",
  },
  {
    id: "hdx-ke",
    name: "Humanitarian Data Exchange",
    short: "HDX",
    logoUrl: "/sources/hdx.png",
    door: "api",
    address: "https://data.humdata.org/api/3/action/package_search?fq=groups:ken",
    collection: "Datasets filed under Kenya by WFP, WHO, UNHCR, IOM and NGOs",
    country: "KE",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Humanitarian",
    brand: "#007CE0",
  },
  {
    id: "unhcr-ke",
    name: "UNHCR",
    short: "UNH",
    logoUrl: "/sources/unhcr.png",
    door: "api",
    address: "https://api.unhcr.org/population/v1/population/?coa=KEN",
    collection: "Refugees and displaced people hosted in Kenya, and those who left it",
    country: "KE",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Displacement",
    brand: "#0072BC",
  },
  {
    id: "unicef-ke",
    name: "UNICEF Data Warehouse",
    short: "UNI",
    logoUrl: "/sources/unicef.png",
    door: "api",
    address: "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/data/UNICEF,GLOBAL_DATAFLOW,1.0/KEN./",
    collection: "Child health, education, nutrition and water for Kenya",
    country: "KE",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Children",
    brand: "#1CABE2",
  },
  {
    id: "owid-ke",
    name: "Our World in Data",
    short: "OWID",
    logoUrl: "/sources/owid.png",
    door: "api",
    address: "https://ourworldindata.org/grapher/?csvType=filtered&country=KEN",
    collection: "Curated indicators for Kenya, each citing its own source",
    country: "KE",
    cadenceMinutes: 10080,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "tested",
    subject: "Statistics",
    brand: "#B13507",
  },
  {
    id: "who-afro-news",
    name: "WHO Regional Office for Africa",
    short: "WHO",
    logoUrl: "/sources/who.png",
    door: "feed",
    address: "https://afro.who.int/rss/featured-news.xml",
    collection: "Press releases",
    country: "",
    cadenceMinutes: 180,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "general",
    verification: "tested",
    subject: "Health",
    brand: "#0093D5",
  },
  {
    id: "un-news",
    name: "UN News",
    short: "UN",
    logoUrl: "/sources/un.png",
    door: "feed",
    address: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    collection: "All stories: humanitarian, political, health",
    country: "",
    cadenceMinutes: 60,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "general",
    verification: "documented",
    subject: "Humanitarian",
    brand: "#009EDB",
  },
  {
    id: "world-bank",
    name: "World Bank",
    short: "WB",
    logoUrl: "/sources/worldbank.png",
    door: "api",
    address: "https://api.worldbank.org/v2/",
    collection: "Indicators API: economy, population, health. No authentication",
    country: "",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Statistics",
    brand: "#002244",
  },
  {
    id: "who-gho",
    name: "WHO Global Health Observatory",
    short: "GHO",
    logoUrl: "/sources/who.png",
    door: "api",
    address: "https://ghoapi.azureedge.net/api/",
    collection: "Health statistics by country: mortality, immunisation, disease burden",
    country: "",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Health",
    brand: "#0093D5",
  },
  {
    id: "hdx",
    name: "Humanitarian Data Exchange",
    short: "HDX",
    logoUrl: "/sources/hdx.png",
    door: "api",
    address: "https://data.humdata.org/api/3/action/",
    collection: "Datasets from WFP, WHO, UNHCR, IOM and NGOs",
    country: "",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Humanitarian",
    brand: "#007CE0",
  },
  {
    id: "unhcr",
    name: "UNHCR",
    short: "UNH",
    logoUrl: "/sources/unhcr.png",
    door: "api",
    address: "https://api.unhcr.org/population/v1/",
    collection: "Refugees, internally displaced people and asylum, by country of asylum or origin",
    country: "",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Displacement",
    brand: "#0072BC",
  },
  {
    id: "unicef",
    name: "UNICEF Data Warehouse",
    short: "UNI",
    logoUrl: "/sources/unicef.png",
    door: "api",
    address: "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest/",
    collection: "Child health, education, nutrition and water. SDMX, readable as CSV",
    country: "",
    cadenceMinutes: 1440,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Children",
    brand: "#1CABE2",
  },
  {
    id: "owid",
    name: "Our World in Data",
    short: "OWID",
    logoUrl: "/sources/owid.png",
    door: "api",
    address: "https://ourworldindata.org/grapher/",
    collection: "Curated cross-country indicators with their sources cited, as CSV per chart",
    country: "",
    cadenceMinutes: 10080,
    isActive: true,
    lastPolledAt: "",
    documents: 0,
    health: "never",
    scope: "by-country",
    verification: "documented",
    subject: "Statistics",
    brand: "#B13507",
  },
]

/** "Every 3 hours", "Daily", "Not polled" — the cadence as somebody says it. */
export function cadenceLabel(minutes: number): string {
  if (minutes <= 0) return 'Not polled'
  if (minutes < 60) return `Every ${minutes} minutes`
  if (minutes === 60) return 'Hourly'
  if (minutes < 1440) return `Every ${Math.round(minutes / 60)} hours`
  if (minutes === 1440) return 'Daily'
  return `Every ${Math.round(minutes / 1440)} days`
}

/**
 * The address without its protocol. The path is kept, not just the host: two
 * feeds from one body differ only by their path, and trimming to the host
 * would render them identical on the card.
 */
export function shortAddress(address: string): string {
  try {
    const url = new URL(address)
    return `${url.host}${url.pathname}`.replace(/\/$/, '')
  } catch {
    return address
  }
}

/** Free-text match over the name, the address and what the source carries. */
export function matchesSource(source: SourceRow, query: string, country = ''): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = `${source.name} ${source.short} ${source.address} ${source.collection} ${country} ${
    DOORS[source.door].label
  }`.toLowerCase()
  return words.every((w) => hay.includes(w))
}

/**
 * Run history belongs on the source, not on a page of its own.
 *
 * A fetch is only ever interesting in the context of the source that made it,
 * and the cross-source view that a separate Ingestion page would have given is
 * already on the register: every card carries its health and when it was last
 * checked. Airbyte reached the same conclusion and folded its Job History tab
 * into the connection itself. So /sources/:id gains a Runs section when it is
 * built: each fetch with its time, duration, documents seen, added and
 * updated, and the error when one failed.
 */

/** Sources per page. The register grows; the page should not. */
/** Cards say everything about a source; twenty a page, as Hope asked. */
export const SOURCE_CARD_PAGE_SIZE = 20
/** The list says only what changes; fifty rows is the whole register at a glance. */
export const SOURCE_LIST_PAGE_SIZE = 50
export type SourceView = 'cards' | 'list'


/**
 * The register, held in memory.
 *
 * Sample state until the sources API exists. It is a module-level array rather
 * than React state because the register is edited from a different route than
 * the one that lists it, and threading a store through for data that is about
 * to be replaced by a server would be scaffolding built to be thrown away.
 * Every read goes through listSources(), so swapping in a fetch is one change.
 */
const register: SourceRow[] = [...SEED]

export function listSources(): SourceRow[] {
  return register
}

export function findSource(id: string | undefined): SourceRow | undefined {
  return register.find((s) => s.id === id)
}

export function addSource(source: SourceRow): void {
  register.push(source)
}

export function updateSource(id: string, patch: Partial<SourceRow>): void {
  const at = register.findIndex((s) => s.id === id)
  if (at !== -1) register[at] = { ...register[at], ...patch }
}

/** A new, empty source. Defaults chosen so the fewest fields need touching. */
export function blankSource(): SourceRow {
  return {
    id: `s-${Date.now().toString(36)}`,
    name: '',
    short: '',
    logoUrl: '',
    door: 'feed',
    address: '',
    collection: '',
    country: '',
    cadenceMinutes: 360,
    isActive: true,
    lastPolledAt: '',
    documents: 0,
    health: 'never',
    scope: 'general',
    verification: 'listed',
    subject: '',
    brand: '#0F5B62',
  }
}

/** "Ghana Statistical Service" -> "GSS". The monogram, if none is given. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /[A-Za-z]/.test(w))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  // Three letters at most. Four reads as a word somebody is meant to say, and
  // "WHOR" for the WHO's Regional Office is the kind of thing nobody catches
  // until it is on screen beside a citation.
  return words
    .filter((w) => w.length > 3 || w === w.toUpperCase())
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export interface FieldErrors {
  name?: string
  address?: string
  collection?: string
  logoUrl?: string
}

/**
 * What must be true before a source can be saved. Deliberately shallow: this
 * checks the shape of what was typed, not whether the far end answers. Only
 * the server can tell you that, and pretending otherwise in the browser would
 * be a promise the form cannot keep.
 */
export function validateSource(draft: SourceRow): FieldErrors {
  const errors: FieldErrors = {}
  if (!draft.name.trim()) errors.name = 'A source needs the name that will appear in every citation.'
  if (!draft.collection.trim()) errors.collection = 'Say what this source publishes, so the register reads as more than a list of addresses.'

  if (draft.door !== 'upload') {
    const what = draft.door === 'feed' ? 'feed' : draft.door === 'pages' ? 'news page' : 'endpoint'
    if (!draft.address.trim()) {
      errors.address = `A ${what} needs an address.`
    } else {
      try {
        const url = new URL(draft.address)
        if (url.protocol !== 'https:') {
          errors.address = 'Use https. A source we cannot verify in transit is not a source we can cite.'
        }
      } catch {
        errors.address = `That is not a URL. A ${what} address looks like https://example.org/rss/news.xml`
      }
    }
  }

  if (draft.logoUrl.trim()) {
    try {
      const url = new URL(draft.logoUrl)
      if (url.protocol !== 'https:') errors.logoUrl = 'Use an https address for the logo.'
    } catch {
      errors.logoUrl = 'That is not a URL.'
    }
  }

  return errors
}

/** Cadences worth offering. Anything finer is rude to the publisher. */
export const CADENCES = [
  { minutes: 60, label: 'Hourly' },
  { minutes: 180, label: 'Every 3 hours' },
  { minutes: 360, label: 'Every 6 hours' },
  { minutes: 720, label: 'Every 12 hours' },
  { minutes: 1440, label: 'Daily' },
  { minutes: 10080, label: 'Weekly' },
]
