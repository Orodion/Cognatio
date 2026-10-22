import { GraphQLError } from 'graphql';
import { numericDate } from './flexibleDate.js';

/** Genders the app knows (the frontend offers and translates only these) */
export const GENDERS = ['MALE', 'FEMALE', 'UNKNOWN'] as const;

/** Precision of a date as the date field detects it (frontend/src/lib/dateParsing.ts, GEDCOM import) */
export const DATE_PRECISIONS = ['EXACT', 'MONTH', 'YEAR', 'APPROXIMATE'] as const;

/** Marital statuses the app knows (the form offers and translates only these) */
export const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'CIVIL_PARTNERSHIP'] as const;

/** Upper limit of a note in characters; the frontend limits the field to the same length */
export const MAX_NOTE_LENGTH = 10_000;

/** Categories of life events */
export const EVENT_CATEGORIES = ['BIRTH', 'BAPTISM', 'SCHOOL_START', 'WEDDING', 'OCCUPATION', 'MOVE', 'DEATH', 'OTHER'] as const;

/** A gender that is given has to be one of GENDERS; missing means "keep" (update) or UNKNOWN (create) */
export function validateGender(gender: string | null | undefined) {
  if (gender && !(GENDERS as readonly string[]).includes(gender)) {
    throw new GraphQLError(`Invalid gender "${gender}". Allowed: ${GENDERS.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_GENDER' },
    });
  }
}

/** A precision that is given has to be one of DATE_PRECISIONS; empty means none (date without precision or no date) */
export function validateDatePrecision(precision: string | null | undefined, field: string) {
  if (precision && !(DATE_PRECISIONS as readonly string[]).includes(precision)) {
    throw new GraphQLError(`Invalid precision for ${field}: "${precision}". Allowed: ${DATE_PRECISIONS.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_DATE_PRECISION' },
    });
  }
}

/** A marital status that is given has to be one of MARITAL_STATUSES; empty means none */
export function validateMaritalStatus(status: string | null | undefined) {
  if (status && !(MARITAL_STATUSES as readonly string[]).includes(status)) {
    throw new GraphQLError(`Invalid marital status "${status}". Allowed: ${MARITAL_STATUSES.join(', ')}`, {
      extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_MARITAL_STATUS' },
    });
  }
}

/** A date as it is stored: a written-out one ("2. Oktober 1951") in its numeric form; undefined and null stay */
export function storedDateText<T extends string | null | undefined>(value: T): T {
  return (typeof value === 'string' ? numericDate(value) : value) as T;
}
