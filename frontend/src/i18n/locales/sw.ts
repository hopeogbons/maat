import type { Messages } from '../messages'

/** Kiswahili */
export const sw: Messages = {
  meta: {
    title: "Maat · Umesikia jambo? Lihakiki kabla ya kulishiriki.",
    description:
      "Umesikia uvumi? Maat huupima dhidi ya nyaraka rasmi na kutoa uamuzi unaoweza kuuamini: chanzo, taasisi iliyoitoa, tarehe, na kiungo cha hati asili.",
  },
  common: {
    verifyRumour: "Hakiki uvumi",
    readVerifications: "Soma uhakiki",
    language: "Lugha",
    chooseLanguage: "Chagua lugha yako",
    comingSoon: "Inakuja hivi karibuni",
    back: "Rudi",
    close: "Funga",
  },
  countries: { NG: "Nigeria", KE: "Kenya" },
  nav: { howItWorks: "Jinsi inavyofanya kazi", verifications: "Uhakiki", contact: "Wasiliana nasi" },
  hero: {
    quote: "Umesikia jambo? Lihakiki kabla ya kulishiriki.",
    explanation:
      "Katika Misri ya kale, moyo ulipimwa dhidi ya unyoya wa Maat, mungu wa kike wa ukweli, na moyo mwepesi kama ukweli pekee ndio ulipita. Maat hufanya vivyo hivyo na ulichosikia: dai hupimwa dhidi ya rekodi rasmi, nawe unapata uamuzi unaoweza kuuamini.",
    promises: [
      "Kila dai hupimwa dhidi ya nyaraka rasmi",
      "Kila jibu lina chanzo na kiungo cha hati asili",
      "Kukiwa hakuna chanzo, Maat husema hivyo",
    ],
    scrollCue: "Nenda kwenye jinsi inavyofanya kazi",
  },
  trending: {
    label: "Zinazovuma",
    tags: [
      "Bei ya mafuta",
      "Kalenda ya shule",
      "Chanjo",
      "Usajili wa wapiga kura",
      "Kodi mpya",
      "Kafyu",
      "Ufadhili wa masomo",
      "Ada ya pasipoti",
      "Kiwango cha ubadilishaji",
      "Uajiri",
      "Mafuriko",
      "Kufungwa kwa daraja",
      "Mshahara wa chini",
      "Tarehe za mitihani",
    ],
  },
  how: {
    eyebrow: "Jinsi inavyofanya kazi",
    title: "Hatua tatu kutoka uvumi hadi rekodi",
    lead:
      "Maat ni mungu wa kike wa ukweli, usawa na haki wa Misri ya kale. Katika Ukumbi wa Kweli Mbili, kila moyo uliwekwa kwenye mizani yake, mkabala na unyoya, na uzito pekee ndio ulioamua.",
    intro:
      "Ndivyo Maat inavyohukumu uvumi pia. Hakuna kubahatisha wala maoni: huripoti tu kile ambacho hati rasmi inathibitisha, na hukuambia inaposhindwa kuipata.",
    steps: [
      {
        title: "Tuma",
        text: "Andika uvumi au tuma ujumbe wa sauti kwenye mazungumzo yaliyo pembeni mwa ukurasa huu. Sema ulipouona ikiwezekana.",
      },
      {
        title: "Pima",
        text: "Maat hutafuta katika gazeti rasmi, waraka na taarifa kwa vyombo vya habari kutoka kwa taasisi zilizozitoa, na kupima dai dhidi ya kile zinachosema hasa.",
      },
      {
        title: "Taja chanzo",
        text: "Unapata uamuzi, jibu kwa lugha rahisi, chanzo pamoja na taasisi iliyokitoa na tarehe, na kiungo cha hati asili.",
      },
    ],
    legendIntro: "Kila uamuzi ni mojawapo ya tatu:",
    legend: {
      verified: "rekodi inauunga mkono",
      unverified: "rekodi inaupinga",
      insufficient: "hakuna chanzo kilichothibitishwa",
    },
  },
  verdict: { verified: "Imethibitishwa", unverified: "Haijathibitishwa", insufficient: "Ushahidi hautoshi" },
  articles: {
    eyebrow: "Uhakiki",
    title: "Uvumi tuliopima",
    intro: "Kila makala inaonyesha uamuzi, rekodi inasema nini, na hati inayotoka.",
    count: (shown, total) => `${shown} kati ya ${total} uhakiki`,
    filterLabel: "Chuja kwa mada",
    allTopics: "Mada zote",
    minutes: (n) => `dakika ${n}`,
    checked: (date) => `Imehakikiwa ${date}`,
    noSource: "Hakuna chanzo kilichothibitishwa",
    read: "Soma",
  },
  footer: {
    blurb:
      "Imepewa jina la mungu wa kike aliyepima kila moyo dhidi ya unyoya. Maat hupima uvumi dhidi ya rekodi rasmi na kukuonyesha hati iliyo nyuma ya kila jibu.",
    verify: "Hakiki",
    about: "Kuhusu",
    contact: "Wasiliana",
    links: {
      latest: "Uhakiki wa hivi karibuni",
      how: "Jinsi inavyofanya kazi",
      submit: "Tuma uvumi",
      methodology: "Mbinu zetu",
      sources: "Vyanzo tunavyotumia",
      aboutMaat: "Kuhusu Maat",
      team: "Timu",
      partners: "Washirika",
      press: "Vyombo vya habari",
      careers: "Kazi",
    },
    helplineHours: "Simu ya bure, kila siku, saa 1 asubuhi hadi saa 4 usiku",
    whatsapp: "WhatsApp",
    pressLabel: "Vyombo vya habari",
    digestTitle: "Muhtasari wa wiki",
    digestText: "Uvumi tuliopima wiki hii, katika barua pepe moja.",
    emailLabel: "Anwani ya barua pepe",
    subscribe: "Jisajili",
    digestThanks: "Asante. Tarajia muhtasari wa kwanza Ijumaa.",
    copyright: (year) => `© ${year} Maat. Tunapima uvumi dhidi ya rekodi.`,
    privacy: "Faragha",
    terms: "Masharti",
    corrections: "Masahihisho",
    accessibility: "Ufikivu",
  },
  widget: {
    open: "Fungua Maat, msaidizi wa uhakiki wa uvumi",
    close: "Funga Maat",
    dialog: "Uhakiki wa uvumi wa Maat",
    subtitle: "Uhakiki wa uvumi",
    tagline: "Umesikia jambo? Lihakiki kabla ya kulishiriki.",
    legend: {
      verified: "Inaungwa mkono na hati rasmi unayoweza kufungua.",
      unverified: "Rekodi rasmi inapinga uvumi huo.",
      insufficient: "Hakuna chanzo kilichothibitishwa, kwa hivyo Maat husema hivyo badala ya kubahatisha.",
    },
    start: "Anza mazungumzo",
    greeting:
      "Habari, mimi ni Maat. Niambie ulichosikia, kwa maandishi au ujumbe wa sauti, nami nitakihakiki dhidi ya rekodi rasmi na kukuonyesha hati iliyo nyuma ya jibu.",
    placeholder: "Umesikia nini?",
    inputLabel: "Ulichosikia",
    send: "Tuma",
    voiceUpload: "Pakia ujumbe wa sauti",
    voiceNote: "Ujumbe wa sauti",
    citedSource: "Chanzo",
    openOriginal: "Fungua hati asili",
    abstentionTitle: "Hakuna chanzo kilichothibitishwa",
    abstentionText:
      "Maat hutoa tu uamuzi inaoweza kutaja chanzo chake. Ongeza aliyesema, wapi na lini, au shiriki kiungo cha ulipouona, kisha jaribu tena.",
    errorGeneric: "Maat haikuweza kushughulikia hilo sasa hivi. Tafadhali jaribu tena.",
    errorNetwork: "Haikuwezekana kufikia Maat. Angalia muunganisho wako na ujaribu tena.",
    checking: "Maat inahakiki",
    back: "Rudi mwanzo",
    maximise: "Panua",
    restore: "Rudisha ukubwa",
    language: "Lugha",
  },
  mock: {
    verified: (subject, issuer, date) =>
      `Rekodi rasmi inaunga mkono hili. ${issuer} ilichapisha ilani tarehe ${date} inayothibitisha dai kuhusu “${subject}” kama lilivyoelezwa. Fungua hati asili kuona maneno halisi na masharti yoyote.`,
    unverified: (subject, issuer, date) =>
      `Hili halilingani na rekodi rasmi. ${issuer} ilizungumzia “${subject}” tarehe ${date}, na taarifa yake inapinga toleo linalosambaa. Chukulia uvumi huo kuwa haujathibitishwa isipokuwa taasisi hiyo iseme vinginevyo.`,
    insufficient: (subject) =>
      `Sikupata chanzo kilichothibitishwa kinachozungumzia “${subject}”. Hilo halimaanishi ni uongo, bali haujathibitishwa tu.`,
  },
}
