import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, isoToDisplay, displayToIso, dateKey, dateSortKey, numericDate } from '../dateParsing';

const precisionOf = (input: string) => {
  const result = parseFlexibleDate(input);
  return result.ok ? result.value.precision : result.error;
};

describe('parseFlexibleDate', () => {
  it('detects the precision from the input', () => {
    expect(precisionOf('04.01.1980')).toBe('EXACT');
    expect(precisionOf('4.1.1980')).toBe('EXACT');
    expect(precisionOf('1980-01-04')).toBe('EXACT');
    expect(precisionOf('01.1980')).toBe('MONTH');
    expect(precisionOf('1980')).toBe('YEAR');
  });

  it('treats qualifiers and ranges as approximate', () => {
    for (const input of ['um 1980', 'ca. 1980', '~1875', 'nach 1980', 'vor 01.1980', 'about 1980', 'около 1980', '1980-1985', '1980 – 1985']) {
      expect(precisionOf(input)).toBe('APPROXIMATE');
    }
    const range = parseFlexibleDate('1980-1985');
    expect(range.ok && range.value.qualifier).toBe('RANGE');
    const after = parseFlexibleDate('nach 1980');
    expect(after.ok && after.value.qualifier).toBe('AFTER');
  });

  it('rejects invalid input', () => {
    expect(precisionOf('31.02.1980')).toBe('INVALID');
    expect(precisionOf('13.1980')).toBe('INVALID');
    expect(precisionOf('Frühling')).toBe('INVALID');
    expect(precisionOf('1985-1980')).toBe('RANGE_ORDER');
    expect(precisionOf(`${new Date().getFullYear() + 1}`)).toBe('FUTURE');
  });
});

describe('date helpers', () => {
  it('converts between calendar (ISO) and display format', () => {
    expect(isoToDisplay('1980-01-04')).toBe('04.01.1980');
    expect(displayToIso('04.01.1980')).toBe('1980-01-04');
    expect(displayToIso('um 1980')).toBe('');
  });

  it('orders partial dates by their start or end', () => {
    expect(dateKey({ year: 1980 }, 'start')).toBeLessThan(dateKey({ year: 1980, month: 5, day: 1 }));
    expect(dateKey({ year: 1980 }, 'end')).toBeGreaterThan(dateKey({ year: 1980, month: 5, day: 1 }));
  });

  it('gives a sort key for any date as typed, also one in the future, and null for the unreadable', () => {
    expect(dateSortKey('14.09.1951')).toBe(19510914);
    expect(dateSortKey('07.1952')).toBe(19520701);
    expect(dateSortKey('um 1966')).toBe(19660101);
    expect(dateSortKey('1969-1970')).toBe(19690101);
    expect(dateSortKey('03.11.2999')).toBe(29991103);
    expect(parseFlexibleDate('03.11.2999')).toEqual({ ok: false, error: 'FUTURE' });
    expect(dateSortKey('irgendwann')).toBeNull();
    expect(dateSortKey('')).toBeNull();
    expect(dateSortKey(null)).toBeNull();
  });
});

describe('written-out dates', () => {
  it.each([
    ['2. Oktober 1951', '02.10.1951'],
    ['October 2, 1951', '02.10.1951'],
    ['2 de octubre de 1951', '02.10.1951'],
    ['1er octobre 1951', '01.10.1951'],
    ['2 października 1951', '02.10.1951'],
    ['2 октября 1951 г.', '02.10.1951'],
    ['2 жовтня 1951 р.', '02.10.1951'],
    ['Mai 1951', '05.1951'],
    ['um 2. Oktober 1951', 'um 02.10.1951'],
    ['Mai 1951 – 3. Juni 1960', '05.1951-03.06.1960'],
  ])('reads "%s" like %s', (written, numeric) => {
    expect(numericDate(written)).toBe(numeric);
    expect(parseFlexibleDate(written)).toEqual(parseFlexibleDate(numeric));
    expect(parseFlexibleDate(written).ok).toBe(true);
  });

  it('gives the calendar the day of a written-out date', () => {
    expect(displayToIso('2. Oktober 1951')).toBe('1951-10-02');
  });

  it('leaves numeric and unreadable input as it is', () => {
    expect(numericDate('1980 – 1985')).toBe('1980 – 1985');
    expect(numericDate('Sommer 1951')).toBe('Sommer 1951');
    expect(parseFlexibleDate('31. Februar 1951')).toEqual({ ok: false, error: 'INVALID' });
  });
});
