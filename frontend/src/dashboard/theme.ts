/**
 * Chart tokens for the Ma'at dashboard.
 *
 * This file is the single source of truth for every colour a chart draws with.
 * The categorical slots are a validated palette: six hues held at the brand's
 * angles (teal 200, gold 82, violet 295, green 150, blue 258, rose 14) and
 * stepped until all six data-viz checks pass on a white chart surface, in the
 * order below. Worst adjacent pair: CVD ΔE 16.5, normal-vision ΔE 21.3, every
 * slot ≥ 3:1 against the surface. Assign slots in order and never cycle them;
 * a seventh series folds into "Other" instead.
 */

/** Categorical identity. Fixed order: teal, gold, violet, green, blue, rose. */
export const SERIES = ['#04a3aa', '#bd8a00', '#a37aff', '#43a65f', '#4692ff', '#fc5773'] as const

export type Verdict = 'verified' | 'unverified' | 'insufficient'

/**
 * Verdict is a status scale, not identity: reserved meaning, always shipped
 * with an icon and a label. Stepped so all three separate on a white surface
 * (worst pair CVD ΔE 14.5, normal-vision ΔE 15.3). Grey sits below the
 * categorical chroma floor on purpose: "no evidence" should read as neutral.
 */
export const VERDICT: Record<Verdict, string> = {
  verified: '#006a3a',
  unverified: '#c68102',
  insufficient: '#8b9499',
}

export const VERDICT_TINT: Record<Verdict, string> = {
  verified: '#e6f2ea',
  unverified: '#fbf0dc',
  insufficient: '#eef0f1',
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  insufficient: 'Insufficient evidence',
}

export const VERDICT_ORDER: Verdict[] = ['verified', 'unverified', 'insufficient']

/** Sequential magnitude: one hue, light to dark. Lightest step means near zero. */
export const TEAL_RAMP = [
  '#e3f6f7',
  '#c7edef',
  '#a3dde0',
  '#70c8cd',
  '#40b1b7',
  '#03999f',
  '#007e84',
  '#026266',
] as const

/** Chart chrome and ink. Text always wears these, never a series colour. */
export const CHROME = {
  surface: '#ffffff',
  page: '#f9f6f1',
  ink: '#111719',
  inkMuted: '#5d6566',
  inkSoft: '#818889',
  grid: '#e7ecec',
  axis: '#dadfdf',
  tealDeep: '#003239',
  teal: '#00494f',
  tealSoft: '#ddf0f0',
  gold: '#daad46',
  goldDark: '#332305',
} as const

export const FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Options every chart shares: quiet chrome, no toolbar, no animation on refetch. */
export const baseOptions = {
  chart: {
    fontFamily: FONT,
    foreColor: CHROME.inkMuted,
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, speed: 320, animateGradually: { enabled: false } },
    parentHeightOffset: 0,
  },
  grid: {
    borderColor: CHROME.grid,
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { top: 0, right: 8, bottom: 0, left: 4 },
  },
  dataLabels: { enabled: false },
  tooltip: {
    theme: 'light',
    style: { fontSize: '12px', fontFamily: FONT },
    marker: { show: true },
  },
  legend: {
    show: false, // legends are rendered as HTML next to the card title
  },
  states: {
    hover: { filter: { type: 'lighten', value: 0.06 } },
    active: { filter: { type: 'none' } },
  },
} as const

export const axisLabelStyle = {
  colors: CHROME.inkSoft,
  fontSize: '11px',
  fontFamily: FONT,
  fontWeight: 500,
}

/** 1,284 / 12.9K / 4.2M — compact, for values that sit beside a label. */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString('en-GB')
}

export function percent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}
