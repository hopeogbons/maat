import type { Messages } from '../messages'

/** Naijá (Nigerian Pidgin) */
export const pcm: Messages = {
  meta: {
    title: "Maat · You hear something? Verify am before you share am.",
    description:
      "You hear rumour? Maat go weigh am with official document and give you verdict wey you fit trust: the source, the office wey release am, the date, and link go the original.",
  },
  common: {
    verifyRumour: "Verify rumour",
    signIn: "Sign in",
    readVerifications: "Read wetin we don verify",
    language: "Language",
    chooseLanguage: "Choose your language",
    comingSoon: "E dey come soon",
    back: "Go back",
    close: "Close",
  },
  countries: { NG: "Naija", KE: "Kenya" },
  nav: { howItWorks: "How e dey work", verifications: "Verifications", contact: "Contact us" },
  hero: {
    quote: "You hear something? Verify am before you share am.",
    explanation:
      "For ancient Egypt, dem dey weigh heart against the feather of Maat, the goddess of truth, and na only heart wey light like truth fit pass. Maat dey do the same thing with wetin you hear: the claim dey weigh against official record, and you go get verdict wey you fit trust.",
    promises: [
      "Every claim dey weigh against official document",
      "Every answer get source and link go the original",
      "If source no dey, Maat go talk am",
    ],
    scrollCue: "Scroll go how e dey work",
  },
  trending: {
    label: "Wetin dey trend",
    tags: [
      "Fuel price",
      "School calendar",
      "Vaccine",
      "Voter registration",
      "New tax",
      "Curfew",
      "Scholarship",
      "Passport money",
      "Exchange rate",
      "Recruitment",
      "Flood",
      "Bridge wey close",
      "Minimum wage",
      "Exam date",
    ],
  },
  how: {
    eyebrow: "How e dey work",
    title: "Three steps from rumour to record",
    lead:
      "Maat na the goddess of truth, balance and justice for ancient Egypt. For the Hall of Two Truths, dem dey put every heart for her scale, opposite the feather, and na the weight alone dey decide.",
    intro:
      "Na so Maat dey judge rumour too. No guess, no opinion: e go only talk wetin official document support, and go tell you if e no find any.",
    steps: [
      {
        title: "Send",
        text: "Type the rumour or send voice note for the chat wey dey corner of this page. Talk where you see am if you fit.",
      },
      {
        title: "Weigh",
        text: "Maat go search gazette, circular and press statement from the office wey release dem, and weigh the claim against wetin dem really talk.",
      },
      {
        title: "Cite",
        text: "You go get verdict, answer for simple language, the source with the office wey release am and the date, and link go the original document.",
      },
    ],
    legendIntro: "Every verdict na one of three:",
    legend: {
      verified: "the record support am",
      unverified: "the record contradict am",
      insufficient: "no verified source",
    },
  },
  verdict: { verified: "Verified", unverified: "No verify", insufficient: "Evidence no reach" },
  articles: {
    eyebrow: "Verifications",
    title: "Rumour wey we don weigh",
    intro: "Every article dey show the verdict, wetin the record talk, and the document wey e come from.",
    count: (shown, total) => `${shown} of ${total} verifications`,
    filterLabel: "Filter by topic",
    allTopics: "All topics",
    minutes: (n) => `${n} min`,
    checked: (date) => `We check am ${date}`,
    noSource: "No verified source",
    read: "Read",
  },
  footer: {
    blurb:
      "We name am after the goddess wey dey weigh every heart against feather. Maat dey weigh rumour against official record and show you the document behind every answer.",
    verify: "Verify",
    about: "About",
    contact: "Contact",
    links: {
      latest: "Latest verifications",
      how: "How e dey work",
      submit: "Send rumour",
      methodology: "How we dey do am",
      sources: "Sources wey we dey use",
      aboutMaat: "About Maat",
      team: "The team",
      partners: "Partners",
      press: "Press",
      careers: "Work with us",
    },
    helplineHours: "Free to call, every day, 7am to 10pm",
    whatsapp: "WhatsApp",
    pressLabel: "Press",
    digestTitle: "Weekly digest",
    digestText: "The rumour wey we weigh this week, for one email.",
    emailLabel: "Email address",
    subscribe: "Subscribe",
    digestThanks: "Thank you. Expect the first digest on Friday.",
    copyright: (year) => `© ${year} Maat. We dey weigh rumour against the record.`,
    privacy: "Privacy",
    terms: "Terms",
    corrections: "Corrections",
    accessibility: "Accessibility",
  },
  widget: {
    open: "Open Maat, the rumour verification assistant",
    close: "Close Maat",
    dialog: "Maat rumour verification",
    subtitle: "Rumour verification",
    tagline: "You hear something? Verify am before you share am.",
    legend: {
      verified: "Official document wey you fit open support am.",
      unverified: "Official record contradict the rumour.",
      insufficient: "No verified source, so Maat go talk am instead of guess.",
    },
    start: "Start conversation",
    greeting:
      "How far, na Maat be this. Tell me wetin you hear, as text or voice note, I go verify am with official record and show you the document behind the answer.",
    placeholder: "Wetin you hear?",
    inputLabel: "Wetin you hear",
    send: "Send",
    voiceUpload: "Upload voice note",
    voiceNote: "Voice note",
    citedSource: "Source",
    openOriginal: "Open original document",
    abstentionTitle: "No verified source",
    abstentionText:
      "Maat dey only give verdict wey e fit cite. Add who talk am, where and when, or share link of where you see am, then try again.",
    errorGeneric: "Maat no fit process that one now. Abeg try again.",
    errorNetwork: "We no fit reach Maat. Check your connection and try again.",
    checking: "Maat dey verify",
    back: "Go back to start",
    maximise: "Make am big",
    restore: "Return the size",
    language: "Language",
  },
  mock: {
    verified: (subject, issuer, date) =>
      `Official record support this one. ${issuer} release notice on ${date} wey confirm the claim about “${subject}” as dem describe am. Open the original make you see the exact words and any condition.`,
    unverified: (subject, issuer, date) =>
      `This one no match official record. ${issuer} talk about “${subject}” on ${date}, and their statement contradict the version wey dey spread. Take the rumour as unconfirmed unless the office talk otherwise.`,
    insufficient: (subject) =>
      `I no find verified source wey talk about “${subject}”. That one no mean say na lie, e just never confirm.`,
  },
}
