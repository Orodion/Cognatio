/** Formats a date in the language of the application (not the browser language). */
export function formatDate(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale);
}

/**
 * Formats a calendar day without a time of day – such as the start and end of a relation, which are stored as midnight
 * UTC. In local time that midnight would be the previous day west of UTC (e.g. in Brazil).
 */
export function formatDay(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(locale, { timeZone: 'UTC' });
}

export function formatDateTime(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(locale);
}
