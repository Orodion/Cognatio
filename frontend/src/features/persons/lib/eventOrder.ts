import { dateSortKey } from '@/lib/dateParsing';

/** Oldest first (asc) or newest first (desc) */
export type EventOrder = 'asc' | 'desc';

interface Orderable {
  date?: string | null;
  sortOrder?: number | null;
}

/**
 * Events from oldest to newest. The saved `sortOrder` (written by the event form) decides; events that have none
 * (imported from GEDCOM or written by another program) are placed by their date as typed. Events without a readable
 * date come last; events with the same date keep the order in which they arrive (the order of creation).
 * `order` "desc" gives the dated events from newest to oldest (equal ones in the opposite order too); those without a date stay last.
 */
export function sortEvents<T extends Orderable>(events: readonly T[], order: EventOrder = 'asc'): T[] {
  const key = (event: T) => event.sortOrder ?? dateSortKey(event.date);
  const dated = events.filter((event) => key(event) !== null).sort((a, b) => (key(a) as number) - (key(b) as number));
  const undated = events.filter((event) => key(event) === null);
  return [...(order === 'desc' ? dated.reverse() : dated), ...undated];
}
