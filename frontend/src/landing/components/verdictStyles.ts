import type { Verdict } from '@/i18n'

/** Colour bar classes per verdict, shared by cards and badges. */
export const VERDICT_BAR: Record<Verdict, string> = {
  verified: 'bg-verified',
  unverified: 'bg-unverified',
  insufficient: 'bg-insufficient',
}
