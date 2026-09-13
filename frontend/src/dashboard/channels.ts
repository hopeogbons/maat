/** Arrival channels, in the fixed order their colours are assigned in. */
export const CHANNELS = ['WhatsApp', 'Voice note', 'X', 'Facebook'] as const

export type Channel = (typeof CHANNELS)[number]
