export type CountryCode = 'NG' | 'KE'

/** Every language the picker knows about, whether translated yet or not. */
export type LanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'sw' | 'ki' | 'luo' | 'luy' | 'kln' | 'kam' | 'so'

/** Languages with a complete translation. Only these can be selected. */
export type AvailableLanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'sw'

export interface Language {
  code: LanguageCode
  /** The language's own name for itself, shown in the picker. */
  name: string
  englishName: string
  /** Absent for English, which sits above the country lists. */
  country?: CountryCode
  /** BCP 47 tag handed to Intl for dates and numbers. */
  intlLocale: string
  available: boolean
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', englishName: 'English', intlLocale: 'en-GB', available: true },

  { code: 'ha', name: 'Hausa', englishName: 'Hausa', country: 'NG', intlLocale: 'ha-NG', available: true },
  { code: 'yo', name: 'Yorùbá', englishName: 'Yoruba', country: 'NG', intlLocale: 'yo-NG', available: true },
  { code: 'ig', name: 'Igbo', englishName: 'Igbo', country: 'NG', intlLocale: 'ig-NG', available: true },
  { code: 'pcm', name: 'Naijá', englishName: 'Nigerian Pidgin', country: 'NG', intlLocale: 'en-NG', available: true },

  { code: 'sw', name: 'Kiswahili', englishName: 'Swahili', country: 'KE', intlLocale: 'sw-KE', available: true },
  { code: 'ki', name: 'Gĩkũyũ', englishName: 'Kikuyu', country: 'KE', intlLocale: 'ki-KE', available: false },
  { code: 'luo', name: 'Dholuo', englishName: 'Luo', country: 'KE', intlLocale: 'luo-KE', available: false },
  { code: 'luy', name: 'Luluhya', englishName: 'Luhya', country: 'KE', intlLocale: 'luy-KE', available: false },
  { code: 'kln', name: 'Kalenjin', englishName: 'Kalenjin', country: 'KE', intlLocale: 'kln-KE', available: false },
  { code: 'kam', name: 'Kikamba', englishName: 'Kamba', country: 'KE', intlLocale: 'kam-KE', available: false },
  { code: 'so', name: 'Af-Soomaali', englishName: 'Somali', country: 'KE', intlLocale: 'so-KE', available: false },
]

export const COUNTRIES: readonly { code: CountryCode; englishName: string }[] = [
  { code: 'NG', englishName: 'Nigeria' },
  { code: 'KE', englishName: 'Kenya' },
]

export const DEFAULT_LANGUAGE: AvailableLanguageCode = 'en'

export function isAvailable(code: string): code is AvailableLanguageCode {
  return LANGUAGES.some((l) => l.code === code && l.available)
}

export function getLanguageMeta(code: LanguageCode): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
}

/** Languages that belong to no country (English), then each country's list. */
export function groupLanguages() {
  return {
    global: LANGUAGES.filter((l) => !l.country),
    countries: COUNTRIES.map((country) => ({
      ...country,
      languages: LANGUAGES.filter((l) => l.country === country.code),
    })),
  }
}
