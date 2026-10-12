/**
 * Times as ISO timestamps. Without a resolver GraphQL turns a `Date` into its number of milliseconds as text, so the API
 * would answer in two formats (family trees and relations are converted by hand already).
 */
export function isoTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : (value as string | number));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Field resolvers that return the named time fields of a type as ISO timestamps */
export function isoTimes<K extends string>(...fields: K[]): Record<K, (parent: Partial<Record<K, unknown>>) => string | null> {
  return Object.fromEntries(fields.map((field) => [field, (parent: Partial<Record<K, unknown>>) => isoTime(parent[field])])) as Record<
    K,
    (parent: Partial<Record<K, unknown>>) => string | null
  >;
}
