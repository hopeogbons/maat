import type { Messages } from '../messages'

/** Igbo */
export const ig: Messages = {
  meta: {
    title: "Maat · Ị nụrụ ihe? Nyochaa ya tupu ị kesaa ya.",
    description:
      "Ị nụrụ asịrị? Maat na-atụle ya site n'akwụkwọ gọọmentị ma nye gị mkpebi ị pụrụ ịtụkwasị obi: ebe o si, ụlọ ọrụ wepụtara ya, ụbọchị, na njikọ gaa n'akwụkwọ mbụ.",
  },
  common: {
    verifyRumour: "Nyochaa asịrị",
    readVerifications: "Gụọ nyocha ndị e mere",
    language: "Asụsụ",
    chooseLanguage: "Họrọ asụsụ gị",
    comingSoon: "Na-abịa n'oge na-adịghị anya",
    back: "Laghachi",
    close: "Mechie",
  },
  countries: { NG: "Naịjịrịa", KE: "Kenya" },
  nav: { howItWorks: "Otú ọ si arụ ọrụ", verifications: "Nyocha", contact: "Kpọtụrụ anyị" },
  hero: {
    quote: "Ị nụrụ ihe? Nyochaa ya tupu ị kesaa ya.",
    explanation:
      "N'Ijipt oge ochie, a na-atụ obi na nku Maat, chi nwanyị nke eziokwu, naanị obi dị mfe ka eziokwu na-agafe. Maat na-eme otu ihe ahụ n'ihe ị nụrụ: a na-atụle nkwupụta ahụ site n'ihe ndekọ gọọmentị, ị nwetakwa mkpebi ị pụrụ ịtụkwasị obi.",
    promises: [
      "A na-atụle nkwupụta ọ bụla site n'akwụkwọ gọọmentị",
      "Azịza ọ bụla nwere ebe o si na njikọ gaa n'akwụkwọ mbụ",
      "Ọ bụrụ na enweghị ebe o si, Maat ga-ekwu ya",
    ],
    scrollCue: "Gaa n'otú ọ si arụ ọrụ",
  },
  trending: {
    label: "Ihe a na-ekwu",
    tags: [
      "Ọnụ ahịa mmanụ",
      "Kalenda ụlọ akwụkwọ",
      "Ọgwụ mgbochi",
      "Ndebanye aha ndị ntuli aka",
      "Ụtụ ọhụrụ",
      "Mmachi ịpụ apụ",
      "Enyemaka akwụkwọ",
      "Ego paspọtụ",
      "Mgbanwe ego",
      "Mbanye ọrụ",
      "Idei mmiri",
      "Mmechi àkwà mmiri",
      "Ụgwọ ọnwa kacha nta",
      "Ụbọchị ule",
    ],
  },
  how: {
    eyebrow: "Otú ọ si arụ ọrụ",
    title: "Nzọụkwụ atọ site n'asịrị ruo n'ihe ndekọ",
    lead:
      "Maat bụ chi nwanyị nke eziokwu, nha anya na ikpe ziri ezi n'Ijipt oge ochie. N'Ụlọ Eziokwu Abụọ, a na-etinye obi ọ bụla n'ihe ọtụtụ ya, n'akụkụ nku ahụ, a na-ekpekwa ya naanị site n'ịdị arọ.",
    intro:
      "Otú ahụ ka Maat si ekpe asịrị. Enweghị ịkọ nkọ, enweghị echiche onwe: ọ na-ekwu naanị ihe akwụkwọ gọọmentị kwadoro, ma gwa gị mgbe ọ hụghị ya.",
    steps: [
      {
        title: "Zipu",
        text: "Dee asịrị ahụ ma ọ bụ zipu ozi olu na mkparịta ụka dị n'akụkụ ibe a. Kwuo ebe ị hụrụ ya ma ọ bụrụ na ị nwere ike.",
      },
      {
        title: "Tụlee",
        text: "Maat na-achọ n'akwụkwọ gazet, akwụkwọ ozi na nkwupụta ndị nta akụkọ sitere n'ụlọ ọrụ wepụtara ha, ma tụlee nkwupụta ahụ site n'ihe ha kwuru n'ezie.",
      },
      {
        title: "Gosi ebe o si",
        text: "Ị ga-enweta mkpebi, azịza n'asụsụ dị mfe, ebe o si ya na ụlọ ọrụ wepụtara ya na ụbọchị, na njikọ gaa n'akwụkwọ mbụ.",
      },
    ],
    legendIntro: "Mkpebi ọ bụla bụ otu n'ime atọ:",
    legend: {
      verified: "ihe ndekọ kwadoro ya",
      unverified: "ihe ndekọ megidere ya",
      insufficient: "ahụghị ebe o si e nyochara",
    },
  },
  verdict: { verified: "E nyochara", unverified: "Enyochabeghị", insufficient: "Ihe akaebe ezughị" },
  articles: {
    eyebrow: "Nyocha",
    title: "Asịrị ndị anyị tụlere",
    intro: "Edemede ọ bụla na-egosi mkpebi, ihe ndekọ kwuru, na akwụkwọ o si na ya.",
    count: (shown, total) => `${shown} n'ime ${total} nyocha`,
    filterLabel: "Họrọ site n'isiokwu",
    allTopics: "Isiokwu niile",
    minutes: (n) => `nkeji ${n}`,
    checked: (date) => `E nyochara ${date}`,
    noSource: "Ahụghị ebe o si e nyochara",
    read: "Gụọ",
  },
  footer: {
    blurb:
      "A kpọrọ ya aha chi nwanyị nke na-atụ obi ọ bụla na nku. Maat na-atụle asịrị site n'ihe ndekọ gọọmentị ma gosi gị akwụkwọ dị n'azụ azịza ọ bụla.",
    verify: "Nyocha",
    about: "Maka anyị",
    contact: "Kpọtụrụ anyị",
    links: {
      latest: "Nyocha ọhụrụ",
      how: "Otú ọ si arụ ọrụ",
      submit: "Zipu asịrị",
      methodology: "Usoro anyị",
      sources: "Ebe anyị si enweta",
      aboutMaat: "Maka Maat",
      team: "Ndị otu anyị",
      partners: "Ndị mmekọ",
      press: "Ndị nta akụkọ",
      careers: "Ọrụ",
    },
    helplineHours: "Ọkpụkpọ n'efu, ụbọchị niile, 7 nke ụtụtụ ruo 10 nke abalị",
    whatsapp: "WhatsApp",
    pressLabel: "Ndị nta akụkọ",
    digestTitle: "Nchịkọta izu",
    digestText: "Asịrị ndị anyị tụlere n'izu a, n'otu email.",
    emailLabel: "Adreesị email",
    subscribe: "Debanye aha",
    digestThanks: "Daalụ. Lee anya nchịkọta mbụ na Fraịde.",
    copyright: (year) => `© ${year} Maat. Anyị na-atụle asịrị site n'ihe ndekọ.`,
    privacy: "Nzuzo",
    terms: "Usoro iwu",
    corrections: "Mmezi",
    accessibility: "Ohere nnweta",
  },
  widget: {
    open: "Mepee Maat, onye enyemaka nyocha asịrị",
    close: "Mechie Maat",
    dialog: "Nyocha asịrị Maat",
    subtitle: "Nyocha asịrị",
    tagline: "Ị nụrụ ihe? Nyochaa ya tupu ị kesaa ya.",
    legend: {
      verified: "Akwụkwọ gọọmentị ị pụrụ imepe kwadoro ya.",
      unverified: "Ihe ndekọ gọọmentị megidere asịrị ahụ.",
      insufficient: "Ahụghị ebe o si e nyochara, ya mere Maat kwuru ya kama ịkọ nkọ.",
    },
    start: "Malite mkparịta ụka",
    greeting:
      "Ndewo, abụ m Maat. Gwa m ihe ị nụrụ, n'ederede ma ọ bụ ozi olu, m ga-enyocha ya site n'ihe ndekọ gọọmentị ma gosi gị akwụkwọ dị n'azụ azịza ahụ.",
    placeholder: "Gịnị ka ị nụrụ?",
    inputLabel: "Ihe ị nụrụ",
    send: "Zipu",
    voiceUpload: "Bulite ozi olu",
    voiceNote: "Ozi olu",
    citedSource: "Ebe o si",
    openOriginal: "Mepee akwụkwọ mbụ",
    abstentionTitle: "Ahụghị ebe o si e nyochara",
    abstentionText:
      "Maat na-enye naanị mkpebi o nwere ike igosi ebe o si. Tinye onye kwuru ya, ebe na mgbe, ma ọ bụ zipu njikọ ebe ị hụrụ ya, ma nwaa ọzọ.",
    errorGeneric: "Maat enweghị ike ịrụ nke ahụ ugbu a. Biko nwaa ọzọ.",
    errorNetwork: "Enweghị ike iru Maat. Lelee njikọ gị ma nwaa ọzọ.",
    checking: "Maat na-enyocha",
    back: "Laghachi na mmalite",
    maximise: "Gbasaa",
    restore: "Weghachi nha",
    language: "Asụsụ",
  },
  mock: {
    verified: (subject, issuer, date) =>
      `Ihe ndekọ gọọmentị kwadoro nke a. ${issuer} wepụtara ọkwa na ${date} nke kwadoro nkwupụta banyere “${subject}” dị ka a kọwara ya. Mepee akwụkwọ mbụ ka ị hụ okwu ndị ahụ kpọmkwem na ọnọdụ ọ bụla dị.`,
    unverified: (subject, issuer, date) =>
      `Nke a adabaghị n'ihe ndekọ gọọmentị. ${issuer} kwuru banyere “${subject}” na ${date}, nkwupụta ya megidekwara ụdị nke na-agbasa. Were asịrị ahụ dị ka nke enyochabeghị ruo mgbe ụlọ ọrụ ahụ kwuru ihe ọzọ.`,
    insufficient: (subject) =>
      `Ahụghị m ebe o si e nyochara nke na-ekwu banyere “${subject}”. Nke ahụ apụtaghị na ọ bụ ụgha, naanị na enyochabeghị ya.`,
  },
}
