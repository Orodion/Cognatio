/**
 * Texts the import writes into the data (titles of events, words of approximate dates). They come in the language
 * of the user's interface, which the client sends; the server itself knows no language. The date words are the same as
 * `dateWords` in frontend/src/i18n/locales/*.json (a test compares them), so the form understands every imported date.
 */

export const IMPORT_LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'uk'] as const;
export type ImportLanguage = (typeof IMPORT_LANGUAGES)[number];

/** Without a language (or with an unknown one) English applies, like the default language of the interface */
export const DEFAULT_IMPORT_LANGUAGE: ImportLanguage = 'en';

/** Language of a request ("de", "de-DE", …); unknown values give the default language */
export function importLanguage(value: unknown): ImportLanguage {
  const code = typeof value === 'string' ? value.trim().toLowerCase().split(/[-_]/)[0] : '';
  return (IMPORT_LANGUAGES as readonly string[]).includes(code) ? (code as ImportLanguage) : DEFAULT_IMPORT_LANGUAGE;
}

type Texts = Record<ImportLanguage, string>;

/** Words for "about", "after" and "before" of every language; the first word is the one the import writes */
export const DATE_WORDS: Record<ImportLanguage, Record<'about' | 'after' | 'before', string[]>> = {
  en: { about: ['about', 'around', 'circa', 'approx.', 'approx', 'abt.', 'abt'], after: ['after', 'aft.', 'aft'], before: ['before', 'bef.', 'bef'] },
  de: { about: ['um', 'ca.', 'ca', 'circa', 'etwa', 'ungefähr'], after: ['nach'], before: ['vor'] },
  es: {
    about: ['hacia', 'aprox.', 'aprox', 'aproximadamente', 'circa', 'ca.', 'ca'],
    after: ['después de', 'despues de', 'tras', 'desp.'],
    before: ['antes de', 'ant.'],
  },
  fr: { about: ['vers', 'environ', 'env.', 'env', 'circa', 'ca.', 'ca'], after: ['après', 'apres', 'apr.'], before: ['avant', 'av.'] },
  it: { about: ['circa', 'intorno al', 'intorno', 'ca.', 'ca'], after: ['dopo il', 'dopo'], before: ['prima del', 'prima di', 'prima'] },
  nl: { about: ['circa', 'ca.', 'ca', 'omstreeks', 'rond', 'ongeveer'], after: ['na'], before: ['voor', 'vóór'] },
  pl: { about: ['około', 'ok.', 'circa', 'ca.', 'ca'], after: ['po'], before: ['przed'] },
  pt: {
    about: ['cerca de', 'cerca', 'aprox.', 'aprox', 'aproximadamente', 'circa', 'ca.', 'ca'],
    after: ['depois de', 'depois', 'após', 'apos'],
    before: ['antes de', 'antes'],
  },
  ru: { about: ['около', 'примерно', 'ок.'], after: ['после'], before: ['до'] },
  uk: { about: ['близько', 'приблизно', 'бл.', 'прибл.', 'орієнтовно'], after: ['після'], before: ['до'] },
};

/** Words of all languages for one qualifier, longest first (so "ca." wins over "ca") */
export function qualifierWords(key: 'about' | 'after' | 'before'): string[] {
  return [...new Set(Object.values(DATE_WORDS).flatMap((words) => words[key]))].sort((a, b) => b.length - a.length);
}

/** Title of an event without a title of its own in the file (EVEN without value and TYPE) */
export const EVENT_TITLE: Texts = {
  en: 'Event',
  de: 'Ereignis',
  es: 'Acontecimiento',
  fr: 'Événement',
  it: 'Evento',
  nl: 'Gebeurtenis',
  pl: 'Wydarzenie',
  pt: 'Acontecimento',
  ru: 'Событие',
  uk: 'Подія',
};

/** Title of a second birth or death of a person (the first fills the fields of the person) */
export const BIRTH_TITLE: Texts = {
  en: 'Birth',
  de: 'Geburt',
  es: 'Nacimiento',
  fr: 'Naissance',
  it: 'Nascita',
  nl: 'Geboorte',
  pl: 'Narodziny',
  pt: 'Nascimento',
  ru: 'Рождение',
  uk: 'Народження',
};
export const DEATH_TITLE: Texts = {
  en: 'Death',
  de: 'Tod',
  es: 'Defunción',
  fr: 'Décès',
  it: 'Morte',
  nl: 'Overlijden',
  pl: 'Śmierć',
  pt: 'Óbito',
  ru: 'Смерть',
  uk: 'Смерть',
};
/** Title of a further occupation without a value */
export const OCCUPATION_TITLE: Texts = {
  en: 'Occupation',
  de: 'Beruf',
  es: 'Profesión',
  fr: 'Profession',
  it: 'Professione',
  nl: 'Beroep',
  pl: 'Zawód',
  pt: 'Profissão',
  ru: 'Профессия',
  uk: 'Професія',
};
/** Title of a further residence */
export const RESIDENCE_TITLE: Texts = {
  en: 'Residence',
  de: 'Wohnort',
  es: 'Residencia',
  fr: 'Résidence',
  it: 'Residenza',
  nl: 'Woonplaats',
  pl: 'Miejsce zamieszkania',
  pt: 'Residência',
  ru: 'Место жительства',
  uk: 'Місце проживання',
};

/** Label of a parent-child relation from PEDI (adopted, foster) */
export const CHILD_LABELS: Record<'adopted' | 'foster', Texts> = {
  adopted: {
    en: 'Adopted child',
    de: 'Adoptivkind',
    es: 'Hijo adoptivo',
    fr: 'Enfant adoptif',
    it: 'Figlio adottivo',
    nl: 'Adoptiefkind',
    pl: 'Dziecko adoptowane',
    pt: 'Filho adotivo',
    ru: 'Приёмный ребёнок',
    uk: 'Усиновлена дитина',
  },
  foster: {
    en: 'Foster child',
    de: 'Pflegekind',
    es: 'Hijo de acogida',
    fr: 'Enfant placé',
    it: 'Figlio in affido',
    nl: 'Pleegkind',
    pl: 'Dziecko w rodzinie zastępczej',
    pt: 'Filho de acolhimento',
    ru: 'Ребёнок под опекой',
    uk: 'Дитина під опікою',
  },
};

/** Note of a partnership whose wedding has a place */
export const WEDDING_IN: Texts = {
  en: 'Wedding in {place}',
  de: 'Hochzeit in {place}',
  es: 'Boda en {place}',
  fr: 'Mariage à {place}',
  it: 'Matrimonio a {place}',
  nl: 'Huwelijk in {place}',
  pl: 'Ślub w {place}',
  pt: 'Casamento em {place}',
  ru: 'Свадьба: {place}',
  uk: 'Весілля: {place}',
};
/** Note in place of a medium whose file the import does not have */
export const MEDIUM_MISSING: Texts = {
  en: 'Medium (not taken over): {file}',
  de: 'Medium (nicht übernommen): {file}',
  es: 'Medio (no incorporado): {file}',
  fr: 'Média (non repris) : {file}',
  it: 'Media (non ripreso): {file}',
  nl: 'Medium (niet overgenomen): {file}',
  pl: 'Plik (nie przejęty): {file}',
  pt: 'Ficheiro (não recolhido): {file}',
  ru: 'Медиафайл (не перенесён): {file}',
  uk: 'Медіафайл (не перенесено): {file}',
};

/** Fills the placeholders `{name}` of a text */
export const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);

const BAPTISM: Texts = {
  en: 'Baptism',
  de: 'Taufe',
  es: 'Bautismo',
  fr: 'Baptême',
  it: 'Battesimo',
  nl: 'Doop',
  pl: 'Chrzest',
  pt: 'Batismo',
  ru: 'Крещение',
  uk: 'Хрещення',
};

/** Standard events of other programs → category and title in the app */
export const STANDARD_EVENTS: Record<string, { category: string; title: Texts }> = {
  BAPM: { category: 'BAPTISM', title: BAPTISM },
  CHR: { category: 'BAPTISM', title: BAPTISM },
  BARM: {
    category: 'OTHER',
    title: {
      en: 'Bar Mitzvah',
      de: 'Bar Mitzwa',
      es: 'Bar mitzvá',
      fr: 'Bar-mitsva',
      it: 'Bar mitzvah',
      nl: 'Bar mitswa',
      pl: 'Bar micwa',
      pt: 'Bar mitzvá',
      ru: 'Бар-мицва',
      uk: 'Бар-міцва',
    },
  },
  BASM: {
    category: 'OTHER',
    title: {
      en: 'Bat Mitzvah',
      de: 'Bat Mitzwa',
      es: 'Bat mitzvá',
      fr: 'Bat-mitsva',
      it: 'Bat mitzvah',
      nl: 'Bat mitswa',
      pl: 'Bat micwa',
      pt: 'Bat mitzvá',
      ru: 'Бат-мицва',
      uk: 'Бат-міцва',
    },
  },
  BLES: {
    category: 'OTHER',
    title: {
      en: 'Blessing',
      de: 'Segnung',
      es: 'Bendición',
      fr: 'Bénédiction',
      it: 'Benedizione',
      nl: 'Zegening',
      pl: 'Błogosławieństwo',
      pt: 'Bênção',
      ru: 'Благословение',
      uk: 'Благословення',
    },
  },
  CONF: {
    category: 'OTHER',
    title: {
      en: 'Confirmation',
      de: 'Konfirmation',
      es: 'Confirmación',
      fr: 'Confirmation',
      it: 'Cresima',
      nl: 'Belijdenis',
      pl: 'Bierzmowanie',
      pt: 'Crisma',
      ru: 'Конфирмация',
      uk: 'Конфірмація',
    },
  },
  FCOM: {
    category: 'OTHER',
    title: {
      en: 'First Communion',
      de: 'Erstkommunion',
      es: 'Primera comunión',
      fr: 'Première communion',
      it: 'Prima comunione',
      nl: 'Eerste communie',
      pl: 'Pierwsza komunia',
      pt: 'Primeira comunhão',
      ru: 'Первое причастие',
      uk: 'Перше причастя',
    },
  },
  ORDN: {
    category: 'OCCUPATION',
    title: {
      en: 'Ordination',
      de: 'Ordination',
      es: 'Ordenación',
      fr: 'Ordination',
      it: 'Ordinazione',
      nl: 'Wijding',
      pl: 'Święcenia',
      pt: 'Ordenação',
      ru: 'Рукоположение',
      uk: 'Висвячення',
    },
  },
  ADOP: {
    category: 'OTHER',
    title: {
      en: 'Adoption',
      de: 'Adoption',
      es: 'Adopción',
      fr: 'Adoption',
      it: 'Adozione',
      nl: 'Adoptie',
      pl: 'Adopcja',
      pt: 'Adoção',
      ru: 'Усыновление',
      uk: 'Усиновлення',
    },
  },
  BURI: {
    category: 'OTHER',
    title: {
      en: 'Burial',
      de: 'Beerdigung',
      es: 'Entierro',
      fr: 'Inhumation',
      it: 'Sepoltura',
      nl: 'Begrafenis',
      pl: 'Pogrzeb',
      pt: 'Enterro',
      ru: 'Похороны',
      uk: 'Поховання',
    },
  },
  CREM: {
    category: 'OTHER',
    title: {
      en: 'Cremation',
      de: 'Einäscherung',
      es: 'Cremación',
      fr: 'Crémation',
      it: 'Cremazione',
      nl: 'Crematie',
      pl: 'Kremacja',
      pt: 'Cremação',
      ru: 'Кремация',
      uk: 'Кремація',
    },
  },
  EDUC: {
    category: 'OTHER',
    title: {
      en: 'Education',
      de: 'Ausbildung',
      es: 'Formación',
      fr: 'Formation',
      it: 'Istruzione',
      nl: 'Opleiding',
      pl: 'Wykształcenie',
      pt: 'Formação',
      ru: 'Образование',
      uk: 'Освіта',
    },
  },
  GRAD: {
    category: 'OTHER',
    title: {
      en: 'Graduation',
      de: 'Abschluss',
      es: 'Graduación',
      fr: 'Diplôme',
      it: 'Diploma',
      nl: 'Afstuderen',
      pl: 'Ukończenie szkoły',
      pt: 'Conclusão do curso',
      ru: 'Окончание учёбы',
      uk: 'Закінчення навчання',
    },
  },
  EMIG: {
    category: 'MOVE',
    title: {
      en: 'Emigration',
      de: 'Auswanderung',
      es: 'Emigración',
      fr: 'Émigration',
      it: 'Emigrazione',
      nl: 'Emigratie',
      pl: 'Emigracja',
      pt: 'Emigração',
      ru: 'Эмиграция',
      uk: 'Еміграція',
    },
  },
  IMMI: {
    category: 'MOVE',
    title: {
      en: 'Immigration',
      de: 'Einwanderung',
      es: 'Inmigración',
      fr: 'Immigration',
      it: 'Immigrazione',
      nl: 'Immigratie',
      pl: 'Imigracja',
      pt: 'Imigração',
      ru: 'Иммиграция',
      uk: 'Імміграція',
    },
  },
  NATU: {
    category: 'OTHER',
    title: {
      en: 'Naturalization',
      de: 'Einbürgerung',
      es: 'Naturalización',
      fr: 'Naturalisation',
      it: 'Naturalizzazione',
      nl: 'Naturalisatie',
      pl: 'Naturalizacja',
      pt: 'Naturalização',
      ru: 'Натурализация',
      uk: 'Натуралізація',
    },
  },
  CENS: {
    category: 'OTHER',
    title: {
      en: 'Census',
      de: 'Volkszählung',
      es: 'Censo',
      fr: 'Recensement',
      it: 'Censimento',
      nl: 'Volkstelling',
      pl: 'Spis ludności',
      pt: 'Recenseamento',
      ru: 'Перепись',
      uk: 'Перепис',
    },
  },
  RETI: {
    category: 'OCCUPATION',
    title: {
      en: 'Retirement',
      de: 'Ruhestand',
      es: 'Jubilación',
      fr: 'Retraite',
      it: 'Pensionamento',
      nl: 'Pensioen',
      pl: 'Emerytura',
      pt: 'Reforma',
      ru: 'Выход на пенсию',
      uk: 'Вихід на пенсію',
    },
  },
  PROB: {
    category: 'OTHER',
    title: {
      en: 'Probate',
      de: 'Testamentseröffnung',
      es: 'Apertura del testamento',
      fr: 'Ouverture du testament',
      it: 'Apertura del testamento',
      nl: 'Opening van het testament',
      pl: 'Otwarcie testamentu',
      pt: 'Abertura do testamento',
      ru: 'Вскрытие завещания',
      uk: 'Відкриття заповіту',
    },
  },
  WILL: {
    category: 'OTHER',
    title: {
      en: 'Will',
      de: 'Testament',
      es: 'Testamento',
      fr: 'Testament',
      it: 'Testamento',
      nl: 'Testament',
      pl: 'Testament',
      pt: 'Testamento',
      ru: 'Завещание',
      uk: 'Заповіт',
    },
  },
  PROP: {
    category: 'OTHER',
    title: {
      en: 'Property',
      de: 'Besitz',
      es: 'Propiedad',
      fr: 'Propriété',
      it: 'Proprietà',
      nl: 'Bezit',
      pl: 'Majątek',
      pt: 'Propriedade',
      ru: 'Имущество',
      uk: 'Майно',
    },
  },
  RELI: {
    category: 'OTHER',
    title: {
      en: 'Religion',
      de: 'Religion',
      es: 'Religión',
      fr: 'Religion',
      it: 'Religione',
      nl: 'Religie',
      pl: 'Religia',
      pt: 'Religião',
      ru: 'Религия',
      uk: 'Релігія',
    },
  },
};

const normalizeTitle = (title: string) => title.toLowerCase().replace(/\s+/g, ' ').trim();

/** Every title the import writes in any language → the same key per kind ("Beerdigung", "Burial" → "BURI") */
const TITLE_KEYS: Map<string, string> = (() => {
  const kinds: Array<[string, Texts]> = [
    ...Object.entries(STANDARD_EVENTS).map(([tag, { title }]): [string, Texts] => [title === BAPTISM ? 'BAPTISM' : tag, title]),
    ['EVENT', EVENT_TITLE],
    ['BIRTH', BIRTH_TITLE],
    ['DEATH', DEATH_TITLE],
    ['OCCUPATION', OCCUPATION_TITLE],
    ['RESIDENCE', RESIDENCE_TITLE],
  ];
  const keys = new Map<string, string>();
  for (const [kind, texts] of kinds) {
    for (const text of Object.values(texts)) {
      keys.set(normalizeTitle(text), kind);
    }
  }
  return keys;
})();

/** Key of an imported title independent of the language; null for a title of the user's own */
export const standardTitleKey = (title: string | null | undefined): string | null => TITLE_KEYS.get(normalizeTitle(title ?? '')) ?? null;
