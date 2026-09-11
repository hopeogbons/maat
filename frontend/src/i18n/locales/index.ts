import type { AvailableLanguageCode } from '../languages'
import type { Messages } from '../messages'
import { en } from './en'
import { ha } from './ha'
import { ig } from './ig'
import { pcm } from './pcm'
import { sw } from './sw'
import { yo } from './yo'

export const MESSAGES: Record<AvailableLanguageCode, Messages> = { en, ha, yo, ig, pcm, sw }
