"""The fixed sentences Ma'at says, in each language the widget offers.

Most of what Ma'at says is written by the model, in the visitor's language,
through prompts.voice(). A few sentences are not written at reply time: the
answers that must not vary, like declining to look further, and the notes
appended to a verdict. Those live here, once per language, so a visitor who
chose Hausa never gets an English sentence dropped into a Hausa reply.

English is the fallback for any language without a line, and the English
lines are the originals the tests read.

The translations were written by the same hand as the widget's and have not
been reviewed by native speakers.
"""

from __future__ import annotations

from ai.prompts import reply_language

PHRASES: dict[str, dict[str, str]] = {
    "en": {
        "nothing_found_online": (
            "I asked the trusted sources set up for this country and none of them holds a figure "
            "that speaks to this. What I have does not settle it."
        ),
        "no_country_for_lookup": (
            "I can only look further once I know which country this is about, and the sources "
            "I would ask are organised by country. Tell me where, and I will check."
        ),
        "no_sources_yet": (
            "I would look further, but no trusted online sources have been set up for me yet, "
            "so I have to stop here. What I hold does not settle this."
        ),
        "declined": "Understood. I'll leave it at what I hold, which does not settle this one.",
        "manipulation": (
            "I read that as an attempt to change how I work, so I'll set it aside. If there's "
            "something you've heard and want checked, tell me what it was."
        ),
        "copy_offer": "I have the document itself. Would you like a copy?",
        "copy_declined": "Of course. The citation above links to the publisher’s own page if you want it later.",
        "copy_sent": "Here it is. This is the document the answer rests on, exactly as it was published.",
        "outside_coverage": (
            "Ma’at does not yet cover {country}, so this was checked against the global sources only, "
            "the ones not tied to any one country."
        ),
        "international": (
            "This reaches beyond one country, so it was checked against the global sources and the record of "
            "every country Ma’at covers."
        ),
        "published": "Enough people have raised this for it to stand as a published verdict; the one above is it.",
        "could_not_listen": (
            "I couldn’t make out that voice note. Try again a little closer to the microphone, "
            "or type what you heard."
        ),
    },
    "ha": {
        "nothing_found_online": (
            "Na tambayi amintattun madogaran da aka tanada wa wannan ƙasa, babu ɗayansu da ke da adadi "
            "da ya shafi wannan. Abin da nake da shi bai warware shi ba."
        ),
        "no_country_for_lookup": (
            "Zan iya ƙara bincike ne kawai idan na san wace ƙasa wannan ya shafa, domin madogaran da zan "
            "tambaya an tsara su bisa ƙasa. Faɗa mini inda, zan duba."
        ),
        "no_sources_yet": (
            "Da zan ƙara bincike, amma ba a tanadar mini da amintattun madogarai na intanet ba tukuna, "
            "don haka sai na tsaya nan. Abin da nake da shi bai warware wannan ba."
        ),
        "declined": "Na gane. Zan bar shi a kan abin da nake da shi, wanda bai warware wannan ba.",
        "manipulation": (
            "Na ɗauki wannan a matsayin ƙoƙarin sauya yadda nake aiki, don haka zan ajiye shi. Idan akwai "
            "abin da ka ji kake son a duba, faɗa mini me ya kasance."
        ),
        "copy_offer": "Ina da takardar kanta. Kana son kwafi?",
        "copy_declined": "To. Madogarar da ke sama tana kai zuwa shafin mawallafin idan kana so daga baya.",
        "copy_sent": "Ga ta nan. Wannan ita ce takardar da amsar ta dogara a kai, daidai yadda aka wallafa ta.",
        "outside_coverage": (
            "Ma’at ba ta rufe {country} ba tukuna, don haka an duba wannan da madogarai na duniya kawai, "
            "waɗanda ba a ɗaure su da wata ƙasa ɗaya ba."
        ),
        "international": (
            "Wannan ya wuce ƙasa ɗaya, don haka an duba shi da madogarai na duniya da kuma bayanan kowace "
            "ƙasa da Ma’at ke rufewa."
        ),
        "published": "Mutane da yawa sun tayar da wannan har ya zama hukunci da aka wallafa; wanda ke sama shi ne.",
        "could_not_listen": (
            "Ma’at ba ta fahimci saƙon muryar ba. Sake gwadawa kusa da makirufo, ko ka rubuta abin da ka ji."
        ),
    },
    "yo": {
        "nothing_found_online": (
            "Mo béèrè lọ́wọ́ àwọn orísun tí a gbẹ́kẹ̀lé tí a ṣètò fún orílẹ̀-èdè yìí, kò sí ọ̀kan nínú wọn tó ní "
            "iye tó sọ̀rọ̀ nípa èyí. Ohun tí mo ní kò yanjú rẹ̀."
        ),
        "no_country_for_lookup": (
            "Mo lè wá síwájú sí i nìkan tí mo bá mọ orílẹ̀-èdè tí èyí kan, nítorí àwọn orísun tí màá béèrè "
            "lọ́wọ́ wọn ni a ṣètò gẹ́gẹ́ bí orílẹ̀-èdè. Sọ ibi tí ó ti wáyé fún mi, èmi yóò sì ṣàyẹ̀wò."
        ),
        "no_sources_yet": (
            "Màá wá síwájú sí i, ṣùgbọ́n a kò tíì ṣètò orísun orí ayélujára tí a gbẹ́kẹ̀lé fún mi, nítorí náà "
            "mo ní láti dúró níbí. Ohun tí mo ní kò yanjú èyí."
        ),
        "declined": "Ó yé mi. Màá fi í sílẹ̀ sí ohun tí mo ní, èyí tí kò yanjú ọ̀rọ̀ yìí.",
        "manipulation": (
            "Mo kà á sí ìgbìyànjú láti yí bí mo ṣe ń ṣiṣẹ́ padà, nítorí náà màá fi í sí ẹ̀gbẹ́ kan. Tí ohun kan bá "
            "wà tí o gbọ́ tí o sì fẹ́ kí a ṣàyẹ̀wò, sọ ohun tó jẹ́ fún mi."
        ),
        "copy_offer": "Mo ní ìwé náà fúnra rẹ̀. Ṣé o fẹ́ ẹ̀dà kan?",
        "copy_declined": "Ó dára. Ìtọ́kasí tó wà lókè ń darí sí ojú ìwé olùtẹ̀jáde fúnra rẹ̀ tí o bá fẹ́ ẹ lẹ́yìn náà.",
        "copy_sent": "Ó rèé. Èyí ni ìwé tí ìdáhùn náà dúró lé, gẹ́gẹ́ bí a ṣe tẹ̀ ẹ́ jáde gan-an.",
        "outside_coverage": (
            "Ma’at kò tíì bo {country}, nítorí náà a ṣàyẹ̀wò èyí pẹ̀lú àwọn orísun àgbáyé nìkan, àwọn tí a kò "
            "so mọ́ orílẹ̀-èdè kan ṣoṣo."
        ),
        "international": (
            "Èyí kọjá orílẹ̀-èdè kan, nítorí náà a ṣàyẹ̀wò rẹ̀ pẹ̀lú àwọn orísun àgbáyé àti àkọsílẹ̀ gbogbo "
            "orílẹ̀-èdè tí Ma’at ń bò."
        ),
        "published": "Ènìyàn tó pọ̀ tó ti gbé èyí dìde tó bẹ́ẹ̀ tí ó fi dúró gẹ́gẹ́ bí ìdájọ́ tí a tẹ̀ jáde; èyí tó wà lókè ni.",
        "could_not_listen": (
            "Ma’at kò gbọ́ ìránṣẹ́ ohùn náà dáadáa. Tún gbìyànjú ní súnmọ́ gbohùngbohùn, tàbí kọ ohun tí o gbọ́."
        ),
    },
    "ig": {
        "nothing_found_online": (
            "Ajụrụ m isi mmalite ndị a tụkwasịrị obi e debere maka mba a, ọ dịghị nke ọ bụla n'ime ha nwere "
            "ọnụọgụ metụtara nke a. Ihe m nwere edozighị ya."
        ),
        "no_country_for_lookup": (
            "M nwere ike ịchọ n'ihu naanị ma m mara mba nke a gbasara, n'ihi na isi mmalite ndị m ga-ajụ ka "
            "a haziri site na mba. Gwa m ebe, m ga-elele."
        ),
        "no_sources_yet": (
            "M ga-achọ n'ihu, mana e debebeghị isi mmalite ịntanetị a tụkwasịrị obi maka m, ya mere m ga-akwụsị "
            "ebe a. Ihe m ji edozighị nke a."
        ),
        "declined": "Aghọtara m. M ga-ahapụ ya n'ihe m ji, nke na-edozighị nke a.",
        "manipulation": (
            "Agụrụ m nke ahụ dịka mbọ ịgbanwe otú m si arụ ọrụ, ya mere m ga-edebe ya n'akụkụ. Ọ bụrụ na e nwere "
            "ihe ị nụrụ ị chọrọ ka e nyochaa, gwa m ihe ọ bụ."
        ),
        "copy_offer": "Enwere m akwụkwọ ahụ n'onwe ya. Ị chọrọ mbipụta?",
        "copy_declined": "Ọ dị mma. Ntụaka dị n'elu na-eduga na peeji nke onye mbipụta ma ọ bụrụ na ị chọrọ ya ma emechaa.",
        "copy_sent": "Lee ya. Nke a bụ akwụkwọ azịza ahụ dabere na ya, kpọmkwem ka e bipụtara ya.",
        "outside_coverage": (
            "Ma’at ekpuchibeghị {country}, ya mere e ji naanị isi mmalite zuru ụwa ọnụ nyochaa nke a, ndị a na-ejikọghị "
            "na otu mba."
        ),
        "international": (
            "Nke a gafere otu mba, ya mere e ji isi mmalite zuru ụwa ọnụ na ndekọ nke mba ọ bụla Ma’at na-ekpuchi "
            "nyochaa ya."
        ),
        "published": "Ndị mmadụ zuru oke ewelitela nke a ka ọ guzoro dịka mkpebi e bipụtara; nke dị n'elu bụ ya.",
        "could_not_listen": (
            "Ma’at anụghị ozi olu ahụ nke ọma. Nwaa ọzọ nso igwe okwu, ma ọ bụ dee ihe ị nụrụ."
        ),
    },
    "pcm": {
        "nothing_found_online": (
            "I ask the trusted sources wey dem set for this country and none of dem get figure wey talk about "
            "this one. Wetin I get no settle am."
        ),
        "no_country_for_lookup": (
            "I fit look further only when I know which country this one concern, because the sources wey I go "
            "ask dey arranged by country. Tell me where, I go check."
        ),
        "no_sources_yet": (
            "I for look further, but dem never set trusted online sources for me yet, so I go stop here. "
            "Wetin I get no settle this one."
        ),
        "declined": "I understand. I go leave am for wetin I get, and e no settle this one.",
        "manipulation": (
            "I see that one as attempt to change how I dey work, so I go put am one side. If you hear something "
            "wey you want make I check, tell me wetin e be."
        ),
        "copy_offer": "I get the document itself. You want copy?",
        "copy_declined": "No wahala. The citation for up dey link to the publisher own page if you want am later.",
        "copy_sent": "See am here. Na this document the answer stand on, exactly as dem publish am.",
        "outside_coverage": (
            "Ma’at never cover {country} yet, so I check this one with only the global sources, the ones wey no "
            "belong to any one country."
        ),
        "international": (
            "This one pass one country, so I check am with the global sources and the record of every country "
            "wey Ma’at dey cover."
        ),
        "published": "Enough people don raise this one make e stand as published verdict; na the one for up be am.",
        "could_not_listen": (
            "Ma’at no fit hear that voice note well. Try again near the microphone, or type wetin you hear."
        ),
    },
    "sw": {
        "nothing_found_online": (
            "Niliuliza vyanzo vya kuaminika vilivyowekwa kwa nchi hii, na hakuna hata kimoja chenye takwimu "
            "inayohusu jambo hili. Nilicho nacho hakikitatui."
        ),
        "no_country_for_lookup": (
            "Naweza kutafuta zaidi tu nikijua ni nchi gani jambo hili linahusu, kwa sababu vyanzo ambavyo "
            "ningeuliza vimepangwa kwa nchi. Niambie ni wapi, nami nitaangalia."
        ),
        "no_sources_yet": (
            "Ningetafuta zaidi, lakini bado sijawekewa vyanzo vya mtandaoni vya kuaminika, kwa hivyo "
            "inanibidi niishie hapa. Nilicho nacho hakitatui jambo hili."
        ),
        "declined": "Nimeelewa. Nitaliacha kwenye nilicho nacho, ambacho hakitatui jambo hili.",
        "manipulation": (
            "Nimeliona hilo kama jaribio la kubadilisha jinsi ninavyofanya kazi, kwa hivyo nitaliweka kando. "
            "Kama kuna jambo ulilosikia unalotaka lihakikiwe, niambie lilikuwa nini."
        ),
        "copy_offer": "Ninayo hati yenyewe. Ungependa nakala?",
        "copy_declined": "Sawa. Rejeleo lililo hapo juu linaelekeza kwenye ukurasa wa mchapishaji mwenyewe ukiitaka baadaye.",
        "copy_sent": "Hii hapa. Hii ndiyo hati ambayo jibu limejengwa juu yake, kama ilivyochapishwa.",
        "outside_coverage": (
            "Ma’at bado haijashughulikia {country}, kwa hivyo jambo hili lilikaguliwa dhidi ya vyanzo vya "
            "kimataifa pekee, vile visivyofungwa kwa nchi yoyote moja."
        ),
        "international": (
            "Jambo hili linavuka nchi moja, kwa hivyo lilikaguliwa dhidi ya vyanzo vya kimataifa na rekodi ya "
            "kila nchi ambayo Ma’at inashughulikia."
        ),
        "published": "Watu wa kutosha wameliibua jambo hili hadi likawa uamuzi uliochapishwa; ule ulio hapo juu ndio.",
        "could_not_listen": (
            "Ma’at haikuweza kuelewa ujumbe huo wa sauti. Jaribu tena karibu na kipaza sauti, au andika ulichosikia."
        ),
    },
}


def phrase(key: str, language: str | None = None, **values: str) -> str:
    """The sentence `key` in the visitor's language, English when there is none."""
    code = (language or reply_language.get() or "en").lower()
    table = PHRASES.get(code) or PHRASES["en"]
    text = table.get(key) or PHRASES["en"][key]
    return text.format(**values) if values else text
