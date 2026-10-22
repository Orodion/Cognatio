/**
 * Dates of persons and life events are kept as the user typed them ("14.09.1951", "09.1951", "1951", "um 1925") with
 * their precision. An assistant may also send ISO dates or written-out ones ("2. Oktober 1951"); they are stored in the
 * form the app shows. Dates are checked
 * like in the form of the app: a day that does not exist, a date after today, a range ending before it starts or
 * free text are refused.
 */
import { dateKey, numericDate, parseFlexibleDate, type DateParseError, type ParsedDate } from '../flexibleDate.js';
import { McpToolError } from './tool.js';

/** Like the form of the app: a longer life is a typing error */
const MAX_LIFESPAN_YEARS = 125;

const pad = (value: string | number) => String(value).padStart(2, '0');

const PROBLEMS: Record<DateParseError, string> = {
  INVALID:
    'is not a date the app understands (e.g. "14.09.1951", "09.1951", "1951", "um 1951", "nach 1951", "1949-1951", "2. Oktober 1951") or the day does not exist',
  RANGE_ORDER: 'ends before it starts',
  FUTURE: 'lies in the future',
};

/** The date read, or INVALID_DATE naming the field */
export function checkedDate(field: string, value: string): ParsedDate {
  const result = parseFlexibleDate(value);
  if (!result.ok) {
    throw new McpToolError('INVALID_DATE', `${field} "${value}" ${PROBLEMS[result.error]}.`);
  }
  return result.value;
}

/** The date as stored and its precision (detected from the date, like in the app); null if empty */
export function storedDate(field: string, text: string | null | undefined): { date: string | null; precision: string | null; parsed: ParsedDate | null } {
  const value = text?.trim();
  if (!value) {
    return { date: null, precision: null, parsed: null };
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const isoMonth = value.match(/^(\d{4})-(\d{2})$/);
  const date = iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : isoMonth ? `${isoMonth[2]}.${isoMonth[1]}` : numericDate(value);
  const parsed = checkedDate(field, date);
  return { date, precision: parsed.precision, parsed };
}

/** Refuses a death before the birth or a life longer than the app allows */
export function checkLifespan(birth: ParsedDate | null, death: ParsedDate | null) {
  if (!birth || !death) {
    return;
  }
  if (dateKey(death.end, 'end') < dateKey(birth.start, 'start')) {
    throw new McpToolError('DEATH_BEFORE_BIRTH', 'The date of death lies before the date of birth.');
  }
  if (death.start.year - birth.end.year > MAX_LIFESPAN_YEARS) {
    throw new McpToolError('LIFESPAN_TOO_LONG', `Between birth and death lie more than ${MAX_LIFESPAN_YEARS} years.`);
  }
}

/** A day for a relation (start or end, e.g. the wedding): ISO "YYYY-MM-DD" or "DD.MM.YYYY"; null if empty */
export function relationDay(field: string, text: string | null | undefined): string | null | undefined {
  if (text === undefined) {
    return undefined;
  }
  const value = text?.trim();
  if (!value) {
    return null;
  }
  const parsed = checkedDate(field, value);
  const { year, month, day } = parsed.start;
  if (parsed.precision !== 'EXACT' || !month || !day) {
    throw new McpToolError('INVALID_DATE', `${field} "${value}" must be a complete day, e.g. "12.06.1948" or "1948-06-12".`);
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** A day of a relation as the app shows it: "1948-06-12T00:00:00.000Z" → "12.06.1948" */
export function shownDay(value: string | null | undefined): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : (value ?? null);
}

/** Year of a stored date ("14.09.1951", "um 1925", "1969-1970" → the first year); null if it has none */
export function yearOf(date: string | null | undefined): number | null {
  const match = date?.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}
