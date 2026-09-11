import type { Messages } from '../messages'

export const en: Messages = {
  meta: {
    title: "Maat · Heard something? Verify it before you share it.",
    description:
      "Heard a rumour? Maat weighs it against official documents and answers with a verdict you can trust: the source, its issuing body, the date and a link to the original.",
  },
  common: {
    verifyRumour: "Verify a rumour",
    readVerifications: "Read verifications",
    language: "Language",
    chooseLanguage: "Choose your language",
    comingSoon: "Coming soon",
    back: "Back",
    close: "Close",
  },
  countries: { NG: "Nigeria", KE: "Kenya" },
  nav: { howItWorks: "How it works", verifications: "Verifications", contact: "Contact" },
  hero: {
    quote: "Heard something? Verify it before you share it.",
    explanation:
      "In ancient Egypt a heart was weighed against the feather of Maat, goddess of truth, and only a heart as light as the truth could pass. Maat does the same with what you have heard: the claim is weighed against the official record, and you get a verdict you can trust.",
    promises: [
      "Every claim weighed against official documents",
      "Every answer cited, with a link to the original",
      "When there is no source, Maat says so",
    ],
    scrollCue: "Scroll to how it works",
  },
  trending: {
    label: "Trending",
    tags: [
      "Fuel price",
      "School calendar",
      "Vaccines",
      "Voter registration",
      "New tax",
      "Curfew",
      "Scholarships",
      "Passport fees",
      "Exchange rate",
      "Recruitment",
      "Flooding",
      "Bridge closure",
      "Minimum wage",
      "Exam dates",
    ],
  },
  how: {
    eyebrow: "How it works",
    title: "Three steps from rumour to record",
    lead:
      "Maat is the ancient Egyptian goddess of truth, balance and justice. In the Hall of Two Truths every heart was placed on her scales, opposite the feather, and judged by weight alone.",
    intro:
      "Maat judges rumours the same way. No guesswork and no opinion: it only reports what an official document supports, and tells you when it cannot find one.",
    steps: [
      {
        title: "Send",
        text: "Type the rumour or send a voice note in the chat at the corner of this page. Say where you saw it if you can.",
      },
      {
        title: "Weigh",
        text: "Maat searches gazettes, circulars and press statements from the issuing bodies and weighs the claim against what they actually say.",
      },
      {
        title: "Cite",
        text: "You get a verdict, the answer in plain language, the source with its issuing body and date, and a link to the original document.",
      },
    ],
    legendIntro: "Every verdict is one of three:",
    legend: {
      verified: "the record supports it",
      unverified: "the record contradicts it",
      insufficient: "no verified source found",
    },
  },
  verdict: { verified: "Verified", unverified: "Unverified", insufficient: "Insufficient evidence" },
  articles: {
    eyebrow: "Verifications",
    title: "Rumours we have weighed",
    intro: "Every article shows the verdict, what the record says, and the document it comes from.",
    count: (shown, total) => `${shown} of ${total} verifications`,
    filterLabel: "Filter by topic",
    allTopics: "All topics",
    minutes: (n) => `${n} min`,
    checked: (date) => `Checked ${date}`,
    noSource: "No verified source found",
    read: "Read",
  },
  footer: {
    blurb:
      "Named after the goddess who weighed every heart against a feather. Maat weighs rumours against the official record and shows you the document behind every answer.",
    verify: "Verify",
    about: "About",
    contact: "Contact",
    links: {
      latest: "Latest verifications",
      how: "How it works",
      submit: "Submit a rumour",
      methodology: "Our methodology",
      sources: "Sources we use",
      aboutMaat: "About Maat",
      team: "The team",
      partners: "Partners",
      press: "Press",
      careers: "Careers",
    },
    helplineHours: "Free to call, every day, 7am to 10pm",
    whatsapp: "WhatsApp",
    pressLabel: "Press",
    digestTitle: "Weekly digest",
    digestText: "The rumours we weighed this week, in one email.",
    emailLabel: "Email address",
    subscribe: "Subscribe",
    digestThanks: "Thanks. Look out for the first digest on Friday.",
    copyright: (year) => `© ${year} Maat. Weighing rumours against the record.`,
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
    tagline: "Heard something? Verify it before you share it.",
    legend: {
      verified: "Backed by an official document you can open.",
      unverified: "The official record contradicts the rumour.",
      insufficient: "No verified source found, so Maat says so rather than guess.",
    },
    start: "Start a conversation",
    greeting:
      "Hi, I’m Maat. Tell me what you heard, in text or a voice note, and I’ll verify it against the official record and show you the document behind the answer.",
    placeholder: "What did you hear?",
    inputLabel: "What you heard",
    send: "Send",
    voiceUpload: "Upload a voice note",
    voiceNote: "Voice note",
    citedSource: "Cited source",
    openOriginal: "Open original document",
    abstentionTitle: "No verified source found",
    abstentionText:
      "Maat only gives a verdict it can cite. Add who said it, where and when, or share a link to where you saw it, and try again.",
    errorGeneric: "Maat could not process that just now. Please try again.",
    errorNetwork: "Maat could not be reached. Check your connection and try again.",
    checking: "Maat is verifying",
    back: "Back to welcome",
    maximise: "Maximise panel",
    restore: "Restore panel size",
    language: "Language",
  },
  mock: {
    verified: (subject, issuer, date) =>
      `An official record supports this. ${issuer} published a notice on ${date} that confirms the claim about “${subject}” as described. Open the original for the exact wording and any conditions that apply.`,
    unverified: (subject, issuer, date) =>
      `This does not match the official record. ${issuer} addressed “${subject}” on ${date} and its statement contradicts the version that is circulating. Treat the rumour as unconfirmed unless the issuing body says otherwise.`,
    insufficient: (subject) =>
      `I could not find a verified source that addresses “${subject}”. That does not make it false, only unconfirmed.`,
  },
}
