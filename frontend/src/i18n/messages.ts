import type { CountryCode } from './languages'

export type Verdict = 'verified' | 'unverified' | 'insufficient'

interface Step {
  title: string
  text: string
}

/**
 * Every user-facing string. English is the reference; each other locale must
 * implement this whole shape, so a missing translation is a compile error.
 */
export interface Messages {
  meta: { title: string; description: string }
  common: {
    verifyRumour: string
    signIn: string
    readVerifications: string
    language: string
    chooseLanguage: string
    comingSoon: string
    back: string
    close: string
  }
  auth: {
    title: string
    lead: string
    username: string
    password: string
    submit: string
    working: string
    failed: string
    throttled: string
    required: string
    needed: string
    signOut: string
    openSignIn: string
  }
  countries: Record<CountryCode, string>
  nav: { howItWorks: string; verifications: string; contact: string }
  hero: {
    quote: string
    explanation: string
    promises: [string, string, string]
    scrollCue: string
  }
  trending: { label: string; tags: string[] }
  how: {
    eyebrow: string
    title: string
    /** The mythology, moved here from the hero. */
    lead: string
    intro: string
    steps: [Step, Step, Step]
    legendIntro: string
    legend: Record<Verdict, string>
  }
  verdict: Record<Verdict, string>
  articles: {
    eyebrow: string
    title: string
    intro: string
    count: (shown: number, total: number) => string
    filterLabel: string
    allTopics: string
    minutes: (n: number) => string
    checked: (date: string) => string
    noSource: string
    read: string
    /** Shown in place of the grid when nothing has been published yet. */
    none: string
    /** The heading when a verification link points at nothing. */
    missing: string
  }
  footer: {
    blurb: string
    verify: string
    about: string
    contact: string
    links: {
      latest: string
      how: string
      submit: string
      methodology: string
      sources: string
      aboutMaat: string
      team: string
      partners: string
      press: string
      careers: string
    }
    helplineHours: string
    whatsapp: string
    pressLabel: string
    digestTitle: string
    digestText: string
    emailLabel: string
    subscribe: string
    digestThanks: string
    copyright: (year: number) => string
    privacy: string
    terms: string
    corrections: string
    accessibility: string
  }
  widget: {
    open: string
    close: string
    dialog: string
    subtitle: string
    tagline: string
    legend: Record<Verdict, string>
    start: string
    greeting: string
    placeholder: string
    inputLabel: string
    send: string
    voiceUpload: string
    voiceNote: string
    meaning: string
    yes: string
    no: string
    record: string
    stopRecording: string
    recording: string
    discardRecording: string
    sendRecording: string
    previewRecording: string
    micDenied: string
    heard: string
    notHeard: string
    spokenReply: string
    citedSource: string
    closestRecord: string
    openOriginal: string
    /** The reveal under a capped list of citations. */
    moreSources: (n: number) => string
    abstentionTitle: string
    abstentionText: string
    errorGeneric: string
    errorNetwork: string
    checking: string
    stages: Record<'reading' | 'searching' | 'weighing' | 'writing', string>
    back: string
    maximise: string
    restore: string
    language: string
  }
  /** Templates for the demo client's sample answers. */
  mock: {
    verified: (subject: string, issuer: string, date: string) => string
    unverified: (subject: string, issuer: string, date: string) => string
    insufficient: (subject: string) => string
  }
}
