import { parseFlexibleDate } from '@/lib/dateParsing';
import { formatDay } from '@/lib/formatDate';

/** Year of a date as typed ("04.01.1880", "um 1880", "1880-1885"); null if it cannot be read */
export function yearOfDate(value: string | null | undefined): number | null {
  const parsed = value?.trim() ? parseFlexibleDate(value, true) : null;
  return parsed?.ok ? parsed.value.start.year : null;
}

/** Day of a relation (start or end, stored as midnight UTC, also as milliseconds in a text) in the language */
export function relationDay(value: string | null | undefined, locale: string): string {
  if (!value) {
    return '';
  }
  return formatDay(/^\d+$/.test(value) ? Number(value) : value, locale);
}
