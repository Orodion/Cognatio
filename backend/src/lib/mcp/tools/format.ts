import { yearOf } from '../dates.js';

/** Fields of a person that lists and summaries need */
export const PERSON_FIELDS =
  'id firstName middleName lastName birthName title nickname gender birthDate birthDatePrecision birthPlace deathDate deathDatePrecision deathPlace occupation isDeleted';

/** All fields of a person */
export const PERSON_DETAILS = `${PERSON_FIELDS} address phone email hobbies maritalStatus nationality languages profilePictureId createdAt updatedAt`;

export interface PersonRow {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  birthName?: string | null;
  title?: string | null;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  birthDatePrecision?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathDatePrecision?: string | null;
  deathPlace?: string | null;
  occupation?: string | null;
  isDeleted?: boolean;
}

/** Persons older than this without a date of death count as dead (as in the statistics of the app) */
const MAX_PLAUSIBLE_AGE = 110;

/** "Dr. Anna Maria Kraft, born Weber" */
export function fullName(person: Pick<PersonRow, 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>): string {
  const name = [person.title, person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
  return person.birthName && person.birthName !== person.lastName ? `${name}, born ${person.birthName}` : name;
}

/** True if nothing says the person has died */
export function isLiving(person: PersonRow, now = new Date()): boolean {
  if (person.deathDate || person.deathPlace) {
    return false;
  }
  const born = yearOf(person.birthDate);
  return born === null || now.getFullYear() - born <= MAX_PLAUSIBLE_AGE;
}

const datePlace = (date?: string | null, place?: string | null) => (date || place ? { date: date ?? null, place: place ?? null } : null);

/** A person in a list: name, dates and places */
export function personSummary(person: PersonRow) {
  return {
    id: person.id,
    name: fullName(person),
    gender: person.gender,
    birth: datePlace(person.birthDate, person.birthPlace),
    death: datePlace(person.deathDate, person.deathPlace),
    living: isLiving(person),
    ...(person.occupation ? { occupation: person.occupation } : {}),
    ...(person.isDeleted ? { inRecycleBin: true } : {}),
  };
}

/** Order of lists: last name, first name */
export const byName = (a: PersonRow, b: PersonRow) =>
  (a.lastName ?? '').localeCompare(b.lastName ?? '') || a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id);

/** Keeps only the fields that have a value (answers stay small) */
export const compact = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))) as Partial<T>;
