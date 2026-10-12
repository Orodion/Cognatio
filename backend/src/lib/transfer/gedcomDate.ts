/**
 * Conversion between the dates of the app (as entered, e.g. "04.01.1980", "um 1980", "1980-1985")
 * and GEDCOM dates ("4 JAN 1980", "ABT 1980", "BET 1980 AND 1985").
 * The input formats match frontend/src/lib/dateParsing.ts.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface Parts {
  year: number;
  month?: number;
  day?: number;
}

const QUALIFIERS: Array<{ gedcom: 'ABT' | 'AFT' | 'BEF'; pattern: RegExp }> = [
  { gedcom: 'ABT', pattern: /^(um|ca\.?|circa|etwa|ungefähr|about|around|approx\.?|abt\.?|около|примерно|~)\s*/i },
  { gedcom: 'AFT', pattern: /^(nach|after|aft\.?|после)\s+/i },
  { gedcom: 'BEF', pattern: /^(vor|before|bef\.?|до)\s+/i },
];

function parseAppSingle(s: string): Parts | null {
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }
  m = s.match(/^(\d{1,2})\.(\d{4})$/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
    return { month: Number(m[1]), year: Number(m[2]) };
  }
  m = s.match(/^(\d{4})$/);
  if (m) {
    return { year: Number(m[1]) };
  }
  return null;
}

const gedcomSingle = (p: Parts) => [p.day, p.month ? MONTHS[p.month - 1] : undefined, p.year].filter((x) => x !== undefined).join(' ');

/** App date → GEDCOM date; unrecognised values as free text (`phrase`). */
export function toGedcomDate(value: string | null | undefined): { date: string } | { phrase: string } | null {
  const s = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!s) {
    return null;
  }

  const range = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (range && !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const from = parseAppSingle(range[1]);
    const to = parseAppSingle(range[2]);
    if (from && to) {
      return { date: `BET ${gedcomSingle(from)} AND ${gedcomSingle(to)}` };
    }
    return { phrase: s };
  }
  for (const { gedcom, pattern } of QUALIFIERS) {
    if (pattern.test(s)) {
      const single = parseAppSingle(s.replace(pattern, ''));
      return single ? { date: `${gedcom} ${gedcomSingle(single)}` } : { phrase: s };
    }
  }
  const single = parseAppSingle(s);
  return single ? { date: gedcomSingle(single) } : { phrase: s };
}

/** Date of a relation (point in time) → GEDCOM "4 JAN 1980" */
export function isoToGedcomDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function parseGedcomSingle(s: string): { parts: Parts; precision: 'EXACT' | 'MONTH' | 'YEAR' } | null {
  const tokens = s.trim().toUpperCase().split(/\s+/);
  const year = Number(tokens.at(-1));
  if (!Number.isInteger(year) || year <= 0) {
    return null;
  }
  if (tokens.length === 1) {
    return { parts: { year }, precision: 'YEAR' };
  }
  const month = MONTHS.indexOf(tokens.at(-2)!) + 1;
  if (!month) {
    return null;
  }
  if (tokens.length === 2) {
    return { parts: { year, month }, precision: 'MONTH' };
  }
  const day = Number(tokens[0]);
  if (tokens.length === 3 && Number.isInteger(day) && day >= 1 && day <= 31) {
    return { parts: { year, month, day }, precision: 'EXACT' };
  }
  return null;
}

const appSingle = (p: Parts) => (p.day ? `${pad(p.day)}.${pad(p.month!)}.${p.year}` : p.month ? `${pad(p.month)}.${p.year}` : String(p.year));

export interface AppDate {
  value: string;
  /** EXACT, MONTH, YEAR, APPROXIMATE – null if the value was not recognised (free text) */
  precision: string | null;
  /** Earliest point in time (for relation dates) */
  start?: Parts;
}

/** GEDCOM date → app date. Unknown calendars and free text are kept as text. */
export function fromGedcomDate(value: string | null | undefined): AppDate | null {
  let s = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!s) {
    return null;
  }
  // The Gregorian calendar is the default; other calendars (@#DJULIAN@ …) stay unchanged as text
  s = s.replace(/^@#DGREGORIAN@\s*/i, '').replace(/^GREGORIAN\s+/i, '');
  const phrase = s.match(/^\((.*)\)$/);
  if (phrase) {
    return { value: phrase[1], precision: null };
  }
  // "INT 1980 (Christmas)": interpreted date – the text is lost, the date remains
  s = s.replace(/^INT\s+/i, '').replace(/\s*\(.*\)$/, '');

  const upper = s.toUpperCase();
  const between = upper.match(/^(?:BET|FROM)\s+(.+?)\s+(?:AND|TO)\s+(.+)$/);
  if (between) {
    const from = parseGedcomSingle(between[1]);
    const to = parseGedcomSingle(between[2]);
    if (from && to) {
      return { value: `${appSingle(from.parts)}-${appSingle(to.parts)}`, precision: 'APPROXIMATE', start: from.parts };
    }
  }
  const qualified = upper.match(/^(ABT|CAL|EST|AFT|BEF|FROM|TO)\s+(.+)$/);
  if (qualified) {
    const single = parseGedcomSingle(qualified[2]);
    if (single) {
      const prefix = { ABT: 'um', CAL: 'um', EST: 'um', AFT: 'nach', FROM: 'nach', BEF: 'vor', TO: 'vor' }[qualified[1]]!;
      return { value: `${prefix} ${appSingle(single.parts)}`, precision: 'APPROXIMATE', start: single.parts };
    }
  }
  const single = parseGedcomSingle(upper);
  if (single) {
    return { value: appSingle(single.parts), precision: single.precision, start: single.parts };
  }
  return { value: s, precision: null };
}

/** Earliest point in time of a GEDCOM date as an ISO timestamp (for startDate/endDate of relations) */
export function gedcomDateToIso(value: string | null | undefined): string | null {
  const start = fromGedcomDate(value)?.start;
  if (!start) {
    return null;
  }
  return new Date(Date.UTC(start.year, (start.month ?? 1) - 1, start.day ?? 1)).toISOString();
}
