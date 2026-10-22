/**
 * Dates of persons and life events as the user types them – the same rules as frontend/src/lib/dateParsing.ts:
 *   04.01.1980        -> EXACT
 *   01.1980           -> MONTH
 *   1980              -> YEAR
 *   um / ca. / ~ 1980 -> APPROXIMATE (likewise "nach 1980", "vor 1980")
 *   1980-1985         -> APPROXIMATE (range, also with complete dates)
 * The words for "about", "after" and "before" are those of every UI language (DATE_WORDS). A date may also be written
 * out in any of them ("2. Oktober 1951", "October 2, 1951", "2 de octubre de 1951", "Mai 1951"); `numericDate` turns it
 * into the numeric form that is stored.
 */
import { IMPORT_LANGUAGES, qualifierWords } from './transfer/languageTexts.js';

export type DatePrecision = 'EXACT' | 'MONTH' | 'YEAR' | 'APPROXIMATE';

export type DateParseError = 'INVALID' | 'RANGE_ORDER' | 'FUTURE';

export interface DateParts {
  year: number;
  month?: number;
  day?: number;
}

export interface ParsedDate {
  precision: DatePrecision;
  /** Earliest point in time (for comparisons) */
  start: DateParts;
  /** Latest point in time – the end for ranges, otherwise equal to `start` */
  end: DateParts;
}

export type DateParseResult = { ok: true; value: ParsedDate } | { ok: false; error: DateParseError };

const escapeRegExp = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsPattern = (key: 'about' | 'after' | 'before') => qualifierWords(key).map(escapeRegExp).join('|');

const QUALIFIER_PATTERNS = [
  // "~" works in every language; "about" may be directly followed by the year ("ca.1880")
  new RegExp(`^(~|${wordsPattern('about')})\\s*`, 'i'),
  new RegExp(`^(${wordsPattern('after')})\\s+`, 'i'),
  new RegExp(`^(${wordsPattern('before')})\\s+`, 'i'),
];

function isValidDay(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

type SingleDate = { parts: DateParts; precision: Exclude<DatePrecision, 'APPROXIMATE'> };

const monthKey = (word: string) => word.toLocaleLowerCase().replace(/\.$/, '');

/** Month numbers by their names in every UI language, long and short, alone and within a date ("października") */
export const MONTH_NAMES: ReadonlyMap<string, number> = (() => {
  const names = new Map<string, number>();
  for (const language of IMPORT_LANGUAGES) {
    for (let month = 1; month <= 12; month++) {
      const day = new Date(Date.UTC(2000, month - 1, 2));
      for (const style of ['long', 'short'] as const) {
        for (const withDay of [false, true]) {
          const format = new Intl.DateTimeFormat(language, { month: style, ...(withDay && { day: 'numeric' }), timeZone: 'UTC' });
          const name = format.formatToParts(day).find((part) => part.type === 'month')?.value;
          if (name) {
            names.set(monthKey(name), month);
          }
        }
      }
    }
  }
  return names;
})();

// Words between the parts of a written date ("2 de octubre de 1951", "2nd of October"; "г." / "р." after the year)
const FILLERS = new Set(['de', 'del', 'of', 'г', 'р']);

/** A date written out: day, month name and year in either order, or month name and year */
function parseWritten(input: string): SingleDate | null {
  const words = input
    .toLocaleLowerCase()
    .replace(/,/g, ' ')
    .split(' ')
    .map((word) => monthKey(word).replace(/^(\d{1,2})(st|nd|rd|th|er|e|º)$/, '$1'))
    .filter((word) => word && !FILLERS.has(word));
  const at = words.findIndex((word) => MONTH_NAMES.has(word));
  const year = words.at(-1) ?? '';
  if (at < 0 || !/^\d{4}$/.test(year)) {
    return null;
  }
  const month = MONTH_NAMES.get(words[at])!;
  const rest = words.filter((_, index) => index !== at && index !== words.length - 1);
  if (rest.length === 0 && words.length === 2) {
    return { parts: { year: Number(year), month }, precision: 'MONTH' };
  }
  if (rest.length !== 1 || !/^\d{1,2}$/.test(rest[0])) {
    return null;
  }
  const day = Number(rest[0]);
  return isValidDay(Number(year), month, day) ? { parts: { year: Number(year), month, day }, precision: 'EXACT' } : null;
}

/** A single date without prefix: DD.MM.YYYY, MM.YYYY or YYYY (also ISO YYYY-MM-DD, or written out) */
function parseSingle(input: string): SingleDate | null {
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
  return m ? { parts: { year: Number(m[1]) }, precision: 'YEAR' } : parseWritten(s);
}

/** Comparison value of a date; a missing month/day counts as the start or the end depending on the direction */
export function dateKey(parts: DateParts, bound: 'start' | 'end' = 'start'): number {
  const month = parts.month ?? (bound === 'start' ? 1 : 12);
  const day = parts.day ?? (bound === 'start' ? 1 : 31);
  return parts.year * 10000 + month * 100 + day;
}

function todayKey(): number {
  const now = new Date();
  return dateKey({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}

/** The two ends of a range ("1980-1985", "01.1980 – 03.1981"); null for anything else, also an ISO date */
const rangeOf = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? null : s.match(/^(.+?)\s*[-–—]\s*(.+)$/));

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The input with every written-out date in its numeric form ("um 2. Oktober 1951" -> "um 02.10.1951", "Mai 1951 -
 * 1960" -> "05.1951-1960"); any other input is returned unchanged.
 */
export function numericDate(input: string): string {
  const s = input.trim().replace(/\s+/g, ' ');
  let changed = false;
  const numeric = (part: string) => {
    const written = /\p{L}/u.test(part) ? parseWritten(part.trim()) : null;
    if (!written) {
      return part.trim();
    }
    changed = true;
    const { year, month, day } = written.parts;
    return day ? `${pad(day)}.${pad(month!)}.${year}` : `${pad(month!)}.${year}`;
  };
  const range = rangeOf(s);
  const qualifier = range ? null : QUALIFIER_PATTERNS.map((pattern) => s.match(pattern)).find(Boolean);
  const result = range ? `${numeric(range[1])}-${numeric(range[2])}` : qualifier ? qualifier[0] + numeric(s.slice(qualifier[0].length)) : numeric(s);
  return changed ? result : input;
}

/** Reads a date as typed; `allowFuture`: do not refuse dates after today (for data already stored, not for input) */
export function parseFlexibleDate(input: string, allowFuture = false): DateParseResult {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) {
    return { ok: false, error: 'INVALID' };
  }
  const notFuture = (value: ParsedDate): DateParseResult =>
    !allowFuture && dateKey(value.start, 'start') > todayKey() ? { ok: false, error: 'FUTURE' } : { ok: true, value };

  // Range: "1980-1985", "1980 – 1985", "01.1980-03.1981"
  const range = rangeOf(s);
  if (range) {
    const from = parseSingle(range[1]);
    const to = parseSingle(range[2]);
    if (!from || !to) {
      return { ok: false, error: 'INVALID' };
    }
    if (dateKey(to.parts, 'end') < dateKey(from.parts, 'start')) {
      return { ok: false, error: 'RANGE_ORDER' };
    }
    return notFuture({ precision: 'APPROXIMATE', start: from.parts, end: to.parts });
  }

  const qualifier = QUALIFIER_PATTERNS.find((pattern) => pattern.test(s));
  if (qualifier) {
    const single = parseSingle(s.replace(qualifier, ''));
    return single ? notFuture({ precision: 'APPROXIMATE', start: single.parts, end: single.parts }) : { ok: false, error: 'INVALID' };
  }

  const single = parseSingle(s);
  return single ? notFuture({ precision: single.precision, start: single.parts, end: single.parts }) : { ok: false, error: 'INVALID' };
}
