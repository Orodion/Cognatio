/**
 * Flexible date input for historical dates.
 *
 * Supported formats (the precision is detected automatically):
 *   04.01.1980        -> EXACT
 *   01.1980           -> MONTH
 *   1980              -> YEAR
 *   um / ca. / ~ 1980 -> APPROXIMATE (likewise "nach 1980", "vor 1980")
 *   1980-1985         -> APPROXIMATE (range, also with complete dates)
 * The words for "about", "after" and "before" come from every UI language (`dateWords` in i18n/locales/*.json),
 * so a date can be typed in any of them, e.g. "um 1880", "about 1880", "около 1880".
 */
import { LOCALES } from '@/i18n/locales';

export type DatePrecision = 'EXACT' | 'MONTH' | 'YEAR' | 'APPROXIMATE';

export type DateQualifier = 'ABOUT' | 'AFTER' | 'BEFORE' | 'RANGE';

export type DateParseError = 'INVALID' | 'RANGE_ORDER' | 'FUTURE';

export interface DateParts {
  year: number;
  month?: number;
  day?: number;
}

export interface ParsedDate {
  precision: DatePrecision;
  qualifier?: DateQualifier;
  /** Earliest point in time (for comparisons) */
  start: DateParts;
  /** Latest point in time – the end for ranges, otherwise equal to `start` */
  end: DateParts;
}

export type DateParseResult = { ok: true; value: ParsedDate } | { ok: false; error: DateParseError };

/** Words of all languages for one qualifier, longest first (so "ca." wins over "ca") */
function qualifierWords(key: 'about' | 'after' | 'before'): string[] {
  const words = Object.values(LOCALES).flatMap((messages) => {
    const value = (messages.dateWords as Record<string, string> | undefined)?.[key];
    return value
      ? value
          .split('|')
          .map((w) => w.trim())
          .filter(Boolean)
      : [];
  });
  return [...new Set(words)].sort((a, b) => b.length - a.length);
}

const escapeRegExp = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsPattern = (key: 'about' | 'after' | 'before') => qualifierWords(key).map(escapeRegExp).join('|');

const QUALIFIER_PATTERNS: Array<{ qualifier: Exclude<DateQualifier, 'RANGE'>; pattern: RegExp }> = [
  // "~" works in every language; "about" may be directly followed by the year ("ca.1880")
  { qualifier: 'ABOUT', pattern: new RegExp(`^(~|${wordsPattern('about')})\\s*`, 'i') },
  { qualifier: 'AFTER', pattern: new RegExp(`^(${wordsPattern('after')})\\s+`, 'i') },
  { qualifier: 'BEFORE', pattern: new RegExp(`^(${wordsPattern('before')})\\s+`, 'i') },
];

function isValidDay(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Parses a single date without prefix: DD.MM.YYYY, MM.YYYY or YYYY (also ISO YYYY-MM-DD). */
function parseSingle(input: string): { parts: DateParts; precision: Exclude<DatePrecision, 'APPROXIMATE'> } | null {
  const s = input.trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidDay(year, month, day) ? { parts: { year, month, day }, precision: 'EXACT' } : null;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidDay(year, month, day) ? { parts: { year, month, day }, precision: 'EXACT' } : null;
  }
  m = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (m) {
    const [month, year] = [Number(m[1]), Number(m[2])];
    return month >= 1 && month <= 12 ? { parts: { year, month }, precision: 'MONTH' } : null;
  }
  m = s.match(/^(\d{4})$/);
  if (m) {
    return { parts: { year: Number(m[1]) }, precision: 'YEAR' };
  }
  return null;
}

/** Comparison value of a date; a missing month/day counts as the start or the end depending on the direction. */
export function dateKey(parts: DateParts, bound: 'start' | 'end' = 'start'): number {
  const month = parts.month ?? (bound === 'start' ? 1 : 12);
  const day = parts.day ?? (bound === 'start' ? 1 : 31);
  return parts.year * 10000 + month * 100 + day;
}

function todayKey(): number {
  const now = new Date();
  return dateKey({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/** `allowFuture`: do not refuse dates after today (for sorting existing data, not for input) */
export function parseFlexibleDate(input: string, allowFuture = false): DateParseResult {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) {
    return { ok: false, error: 'INVALID' };
  }

  // Zeitraum: "1980-1985", "1980 – 1985", "01.1980-03.1981"
  const range = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (range && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const from = parseSingle(range[1]);
    const to = parseSingle(range[2]);
    if (!from || !to) {
      return { ok: false, error: 'INVALID' };
    }
    if (dateKey(to.parts, 'end') < dateKey(from.parts, 'start')) {
      return { ok: false, error: 'RANGE_ORDER' };
    }
    if (!allowFuture && dateKey(from.parts, 'start') > todayKey()) {
      return { ok: false, error: 'FUTURE' };
    }
    return { ok: true, value: { precision: 'APPROXIMATE', qualifier: 'RANGE', start: from.parts, end: to.parts } };
  }

  for (const { qualifier, pattern } of QUALIFIER_PATTERNS) {
    if (pattern.test(s)) {
      const single = parseSingle(s.replace(pattern, ''));
      if (!single) {
        return { ok: false, error: 'INVALID' };
      }
      if (!allowFuture && dateKey(single.parts, 'start') > todayKey()) {
        return { ok: false, error: 'FUTURE' };
      }
      return { ok: true, value: { precision: 'APPROXIMATE', qualifier, start: single.parts, end: single.parts } };
    }
  }

  const single = parseSingle(s);
  if (!single) {
    return { ok: false, error: 'INVALID' };
  }
  if (!allowFuture && dateKey(single.parts, 'start') > todayKey()) {
    return { ok: false, error: 'FUTURE' };
  }
  return { ok: true, value: { precision: single.precision, start: single.parts, end: single.parts } };
}

/** Sort key of a date as typed ("14.09.1951", "um 1925", "1969-1970"); null if it cannot be read */
export function dateSortKey(input: string | null | undefined): number | null {
  const result = input ? parseFlexibleDate(input, true) : null;
  return result?.ok ? dateKey(result.value.start) : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO date (YYYY-MM-DD, e.g. from the calendar) -> DD.MM.YYYY */
export function isoToDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Input -> ISO date for the calendar if the input is an exact date. */
export function displayToIso(input: string): string {
  const result = parseFlexibleDate(input);
  if (!result.ok || result.value.precision !== 'EXACT') {
    return '';
  }
  const { year, month, day } = result.value.start;
  return `${year}-${pad(month!)}-${pad(day!)}`;
}
