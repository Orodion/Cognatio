/** Formats a date in the language of the application (not the browser language). */
export function formatDate(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale);
}

/**
 * Formats a calendar day without a time of day – such as the start and end of a relation, which are stored as midnight
 * UTC. In local time that midnight would be the previous day west of UTC (e.g. in Brazil). Day and month have two
 * digits, like the dates typed at a person ("04.01.1950").
 */
export function formatDay(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(locale);
}
