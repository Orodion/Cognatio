import type { Person } from '@/features/persons/types/person';
import { formatLifeDates, formatPersonName } from '@/features/persons/lib/personUtils';

export const REPORT_TYPES = ['person', 'family', 'ancestors', 'descendants', 'statistics'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Date and place of a fact, e.g. "04.01.1880, Köln" */
export const datePlace = (date?: string | null, place?: string | null) => [date?.trim(), place?.trim()].filter(Boolean).join(', ');

/** Name with life years, e.g. "Anna Kraft (1880 - 1950)" */
export function personWithYears(person: Person) {
  const years = formatLifeDates(person);
  return years ? `${formatPersonName(person)} (${years})` : formatPersonName(person);
}
