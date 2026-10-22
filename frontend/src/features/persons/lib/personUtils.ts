import type { Person } from '@/features/persons/types/person';
import i18n from '@/i18n';

/**
 * Placeholder for a missing first name (the first name is required): saved by the box "First name unknown" and by a
 * GEDCOM import without a first name, the same value as in the backend (format.ts). It is shown in the language of the UI.
 */
export const UNKNOWN_GIVEN_NAME = '(Vorname unbekannt)';
const UNKNOWN_GIVEN_NAMES = new Set(['', UNKNOWN_GIVEN_NAME]);

export const isUnknownGivenName = (firstName?: string | null) => UNKNOWN_GIVEN_NAMES.has((firstName ?? '').trim());

/** First name for display – a placeholder becomes "(first name unknown)" in the current language */
export const displayGivenName = (firstName?: string | null) => (isUnknownGivenName(firstName) ? i18n.t('persons.unknownGivenName') : (firstName ?? ''));

/** Name from first and last name, e.g. for owners of media */
export const formatShortName = (person: Pick<Person, 'firstName' | 'lastName'>) =>
  [displayGivenName(person.firstName), person.lastName].filter(Boolean).join(' ');

/** Sort order for selection lists: by name, persons without a known first name at the end */
export function comparePersonNames(
  a: Pick<Person, 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>,
  b: Pick<Person, 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>,
): number {
  const unknown = Number(isUnknownGivenName(a.firstName)) - Number(isUnknownGivenName(b.firstName));
  return unknown || formatPersonName(a).localeCompare(formatPersonName(b));
}

export function formatPersonName(person: Pick<Person, 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName'>): string {
  const parts = [person.title, displayGivenName(person.firstName), person.middleName, person.lastName].filter(Boolean);
  const name = parts.join(' ').trim();
  if (person.birthName && person.birthName !== person.lastName) {
    return `${name} (${i18n.t('persons.bornAs', { name: person.birthName })})`;
  }
  return name;
}

export function getInitials(person: Pick<Person, 'firstName' | 'lastName'>): string {
  const first = isUnknownGivenName(person.firstName) ? '' : (person.firstName?.charAt(0) ?? '');
  const last = person.lastName?.charAt(0) ?? '';
  return (first + last).toUpperCase() || '?';
}

/** Living persons above this age without death data count as "probably deceased" (date of death missing). */
export const MAX_PLAUSIBLE_AGE = 110;

/** A person counts as deceased when a date or place of death is recorded */
export const isDeceased = (p: Pick<Person, 'deathDate' | 'deathPlace'>) => !!(p.deathDate?.trim() || p.deathPlace?.trim());

function parseYear(dateStr?: string | null): number | null {
  if (!dateStr) {
    return null;
  }
  const match = dateStr.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function calculateAge(birthDate?: string | null, deathDate?: string | null): number | null {
  const birthYear = parseYear(birthDate);
  if (birthYear === null) {
    return null;
  }

  const endYear = parseYear(deathDate) ?? new Date().getFullYear();
  const age = endYear - birthYear;
  return age >= 0 ? age : null;
}

/**
 * Name with date of birth for selection lists, e.g. "Anna Muster (* 04.01.1980)" –
 * this way persons with the same name can be told apart. Without a date of birth only the name.
 */
export function formatPersonOption(person: Pick<Person, 'title' | 'firstName' | 'middleName' | 'lastName' | 'birthName' | 'birthDate'>): string {
  const name = formatPersonName(person);
  return person.birthDate ? `${name} (* ${person.birthDate})` : name;
}

export function formatLifeDates(person: Pick<Person, 'birthDate' | 'deathDate'>, labels: { born: string; died: string } = { born: '*', died: '†' }): string {
  const getYear = (dateStr: string) => {
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : dateStr;
  };

  if (person.birthDate && person.deathDate) {
    return `${getYear(person.birthDate)} - ${getYear(person.deathDate)}`;
  }

  if (person.birthDate) {
    return `${labels.born} ${getYear(person.birthDate)}`;
  }

  if (person.deathDate) {
    return `${labels.died} ${getYear(person.deathDate)}`;
  }

  return '';
}

export function formatFieldValue(value?: string | null | string[]): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '—';
  }
  return value.trim() || '—';
}
