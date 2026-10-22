import type { Person, Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { colognePhonetics, phoneticCodes } from './phonetics.js';

/** Where a person was found – controls the order and the hint in the result list */
export type SearchMatch = 'NAME' | 'PHONETIC' | 'DETAILS' | 'EVENT' | 'NOTE';

export interface SearchResult {
  person: Person;
  matchedIn: SearchMatch[];
}

const NAME_FIELDS = ['firstName', 'middleName', 'lastName', 'birthName', 'nickname'] as const;
const DETAIL_FIELDS = [
  'title',
  'birthDate',
  'birthPlace',
  'deathDate',
  'deathPlace',
  'occupation',
  'hobbies',
  'nationality',
  'address',
  'email',
  'phone',
] as const;
const EVENT_FIELDS = ['title', 'description', 'place'] as const;

const MAX_TERMS = 8;
/** Shorter terms produce too many random phonetic matches */
const MIN_PHONETIC_LENGTH = 3;

export function searchTerms(query: string) {
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))].slice(0, MAX_TERMS);
}

/** Phonetic code of a search term – only for words made of letters with sufficient length */
export function termCode(term: string) {
  return term.length >= MIN_PHONETIC_LENGTH && /^\p{L}+$/u.test(term) ? colognePhonetics(term) : '';
}

const contains = (term: string) => ({ contains: term, mode: 'insensitive' as const });

/** Condition for one term: anywhere in the person, a name variant, the life events or the notes */
function termCondition(term: string): Prisma.PersonWhereInput {
  const code = termCode(term);
  return {
    OR: [
      ...[...NAME_FIELDS, ...DETAIL_FIELDS].map((field) => ({ [field]: contains(term) })),
      ...(code ? [{ phonetics: { has: code } }] : []),
      { events: { some: { OR: EVENT_FIELDS.map((field) => ({ [field]: contains(term) })) } } },
      { notes: { some: { text: contains(term) } } },
    ],
  };
}

const lower = (value: string | null | undefined) => (value ?? '').toLowerCase();

/** Points per term: exact name part > start of a name > part of a name > name variant > other details */
function scoreTerm(person: Person, term: string, inEvents: boolean, inNotes: boolean): { score: number; match?: SearchMatch } {
  const words = NAME_FIELDS.flatMap((field) => lower(person[field]).split(/[\s-]+/)).filter(Boolean);
  if (words.includes(term)) {
    return { score: 100, match: 'NAME' };
  }
  if (words.some((w) => w.startsWith(term))) {
    return { score: 80, match: 'NAME' };
  }
  if (NAME_FIELDS.some((field) => lower(person[field]).includes(term))) {
    return { score: 60, match: 'NAME' };
  }
  const code = termCode(term);
  if (code && person.phonetics.includes(code)) {
    return { score: 50, match: 'PHONETIC' };
  }
  if (DETAIL_FIELDS.some((field) => lower(person[field]).includes(term))) {
    return { score: 30, match: 'DETAILS' };
  }
  if (inEvents) {
    return { score: 20, match: 'EVENT' };
  }
  if (inNotes) {
    return { score: 20, match: 'NOTE' };
  }
  return { score: 0 };
}

/**
 * Search across fields (§2.6): every term must occur – in names, personal data, life events
 * or notes –, names are also compared phonetically ("Meier" finds "Mayer").
 * Results sorted by relevance, deleted persons excluded.
 */
export async function searchPersons(db: PrismaClient, treeId: string, query: string, language?: string | null): Promise<SearchResult[]> {
  const terms = searchTerms(query);
  if (!terms.length) {
    return [];
  }

  const anyTerm = <T>(build: (term: string) => T) => ({ OR: terms.map(build) });
  const persons = await db.person.findMany({
    where: { familyTreeId: treeId, isDeleted: false, AND: terms.map(termCondition) },
    include: {
      // Only to detect whether the hit comes from the life events or the notes
      events: {
        where: anyTerm((t) => ({ OR: EVENT_FIELDS.map((field) => ({ [field]: contains(t) })) })),
        select: { title: true, description: true, place: true },
      },
      notes: { where: anyTerm((t) => ({ text: contains(t) })), select: { text: true } },
    },
  });

  const collator = collatorFor(language);
  return persons
    .map(({ events, notes, ...person }) => {
      const matches = new Set<SearchMatch>();
      let score = 0;
      for (const term of terms) {
        const inEvents = events.some((e) => EVENT_FIELDS.some((field) => lower(e[field]).includes(term)));
        const inNotes = notes.some((n) => lower(n.text).includes(term));
        const result = scoreTerm(person, term, inEvents, inNotes);
        score += result.score;
        if (result.match) {
          matches.add(result.match);
        }
      }
      return { person, matchedIn: [...matches], score };
    })
    .sort(
      (a, b) =>
        b.score - a.score || collator.compare(lower(a.person.lastName), lower(b.person.lastName)) || collator.compare(a.person.firstName, b.person.firstName),
    )
    .map(({ person, matchedIn }) => ({ person, matchedIn }));
}

/**
 * Collator for the language of the user (the server does not know it, the client sends it). Without a language, or with
 * one that is not a valid language tag, the root collation applies, so the order never depends on the server's settings.
 */
export function collatorFor(language?: string | null): Intl.Collator {
  try {
    return new Intl.Collator(language?.trim() || 'und');
  } catch {
    return new Intl.Collator('und');
  }
}

export interface SimilarInput {
  firstName: string;
  lastName?: string | null;
  birthName?: string | null;
  birthDate?: string | null;
  excludeId?: string | null;
}

const MAX_SIMILAR = 5;
/** Birth years further apart than this count as different persons */
const MAX_YEAR_DIFFERENCE = 2;

/** First four-digit year of a date in any notation ("01.05.1950", "um 1950", "1950-05-01") */
export function birthYear(value: string | null | undefined) {
  const match = (value ?? '').match(/(?:^|\D)(\d{4})(?!\d)/);
  return match ? Number(match[1]) : null;
}

/**
 * Possible duplicates when creating a person: same first name and same family name (last or
 * birth name), each compared phonetically; with known birth years at most 2 years apart.
 */
export async function findSimilarPersons(db: PrismaClient, treeId: string, input: SimilarInput) {
  const givenCodes = phoneticCodes(input.firstName);
  const familyCodes = phoneticCodes(input.lastName, input.birthName);
  // Without a family name every person with the same first name would be a hit
  if (!givenCodes.length || !familyCodes.length) {
    return [];
  }

  const candidates = await db.person.findMany({
    where: {
      familyTreeId: treeId,
      isDeleted: false,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      AND: [{ phonetics: { hasSome: givenCodes } }, { phonetics: { hasSome: familyCodes } }],
    },
    take: 50,
  });

  const year = birthYear(input.birthDate);
  const overlaps = (codes: string[], other: string[]) => codes.some((c) => other.includes(c));
  return candidates
    .filter((p) => {
      // Compare first and family names separately (otherwise "Hans Peter" would match "Peter Hans")
      if (!overlaps(givenCodes, phoneticCodes(p.firstName, p.middleName, p.nickname))) {
        return false;
      }
      if (!overlaps(familyCodes, phoneticCodes(p.lastName, p.birthName))) {
        return false;
      }
      const otherYear = birthYear(p.birthDate);
      return year === null || otherYear === null || Math.abs(year - otherYear) <= MAX_YEAR_DIFFERENCE;
    })
    .sort((a, b) => {
      // Same birth year and same spelling first
      const exact = (p: Person) => (birthYear(p.birthDate) === year && year !== null ? 2 : 0) + (lower(p.lastName) === lower(input.lastName) ? 1 : 0);
      return exact(b) - exact(a);
    })
    .slice(0, MAX_SIMILAR);
}

type SimilarCandidate = Pick<Person, 'id' | 'firstName' | 'middleName' | 'nickname' | 'lastName' | 'birthName' | 'birthDate'>;

/**
 * Pairs of persons of a family tree that could be the same person, by the rules of `findSimilarPersons`: the first
 * name of one matches a given name of the other, a family name matches, and known birth years are at most 2 years
 * apart. Persons are compared only within a family name, so large family trees stay fast.
 */
export function similarPairs(persons: SimilarCandidate[], hasGivenName: (person: SimilarCandidate) => boolean): Array<[string, string]> {
  const byFamilyCode = new Map<string, SimilarCandidate[]>();
  for (const person of persons.filter(hasGivenName)) {
    for (const code of phoneticCodes(person.lastName, person.birthName)) {
      byFamilyCode.set(code, [...(byFamilyCode.get(code) ?? []), person]);
    }
  }
  const given = (p: SimilarCandidate) => phoneticCodes(p.firstName);
  const allGiven = (p: SimilarCandidate) => phoneticCodes(p.firstName, p.middleName, p.nickname);
  const overlaps = (codes: string[], other: string[]) => codes.some((c) => other.includes(c));
  const pairs = new Map<string, [string, string]>();
  for (const group of byFamilyCode.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i], group[j]].sort((x, y) => x.id.localeCompare(y.id));
        const yearA = birthYear(a.birthDate);
        const yearB = birthYear(b.birthDate);
        const sameName = overlaps(given(a), allGiven(b)) || overlaps(given(b), allGiven(a));
        if (sameName && (yearA === null || yearB === null || Math.abs(yearA - yearB) <= MAX_YEAR_DIFFERENCE)) {
          pairs.set(`${a.id}|${b.id}`, [a.id, b.id]);
        }
      }
    }
  }
  return [...pairs.values()];
}
