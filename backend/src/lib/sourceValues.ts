import { GraphQLError } from 'graphql';

/** Kinds of sources: only for the symbol and the filter, all have the same fields */
export const SOURCE_TYPES = [
  'CHURCH_BOOK',
  'CIVIL_REGISTER',
  'CENSUS',
  'NEWSPAPER',
  'BOOK',
  'LETTER',
  'GRAVESTONE',
  'WEBSITE',
  'INTERVIEW',
  'DOCUMENT',
  'OTHER',
] as const;

/** Facts of a person a citation can support – birth and death are fields of the person, not events */
export const CITATION_FACTS = ['GENERAL', 'NAME', 'BIRTH', 'DEATH'] as const;
export type CitationFact = (typeof CITATION_FACTS)[number];

/** GEDCOM QUAY: 0 unreliable or estimated, 1 questionable, 2 secondary, 3 primary */
export const QUALITY_LEVELS = [0, 1, 2, 3] as const;

/** Upper limit of a short field (title, author, page …) and of a long one (transcription, note) in characters */
export const MAX_SHORT_LENGTH = 1_000;
export const MAX_LONG_LENGTH = 20_000;

const badInput = (message: string, reason: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', reason } });

/** Text without surrounding blanks, null if empty; refuses one above the limit */
export function cleanText(value: string | null | undefined, max: number, field: string): string | null {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length > max) {
    throw badInput(`${field} must be at most ${max} characters long.`, 'TEXT_TOO_LONG');
  }
  return trimmed || null;
}

/** A required text (title of a source, name of an archive) */
export function requiredText(value: string | null | undefined, max: number, field: string, reason: string): string {
  const text = cleanText(value, max, field);
  if (!text) {
    throw badInput(`${field} must not be empty.`, reason);
  }
  return text;
}

export function validateSourceType(type: string | null | undefined): string {
  if (!type) {
    return 'OTHER';
  }
  if (!(SOURCE_TYPES as readonly string[]).includes(type)) {
    throw badInput(`Invalid source type "${type}". Allowed: ${SOURCE_TYPES.join(', ')}`, 'INVALID_SOURCE_TYPE');
  }
  return type;
}

export function validateQuality(quality: number | null | undefined): number | null {
  if (quality === null || quality === undefined) {
    return null;
  }
  if (!(QUALITY_LEVELS as readonly number[]).includes(quality)) {
    throw badInput(`Invalid quality ${quality}. Allowed: 0 to 3`, 'INVALID_QUALITY');
  }
  return quality;
}

export function validateFact(fact: string | null | undefined): CitationFact {
  if (!fact) {
    return 'GENERAL';
  }
  if (!(CITATION_FACTS as readonly string[]).includes(fact)) {
    throw badInput(`Invalid fact "${fact}". Allowed: ${CITATION_FACTS.join(', ')}`, 'INVALID_FACT');
  }
  return fact as CitationFact;
}
