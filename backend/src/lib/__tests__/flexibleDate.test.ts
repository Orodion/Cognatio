import { MONTH_NAMES, numericDate, parseFlexibleDate } from '../flexibleDate.js';
import { IMPORT_LANGUAGES } from '../transfer/languageTexts.js';

describe('written-out dates', () => {
  it('knows every month in every UI language, no name with two meanings', () => {
    for (const language of IMPORT_LANGUAGES) {
      for (let month = 1; month <= 12; month++) {
        for (const options of [{ month: 'long' }, { month: 'short' }, { month: 'long', day: 'numeric' }, { month: 'short', day: 'numeric' }] as const) {
          const parts = new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).formatToParts(new Date(Date.UTC(2000, month - 1, 2)));
          const name = parts
            .find((part) => part.type === 'month')!
            .value.toLocaleLowerCase()
            .replace(/\.$/, '');
          expect([language, name, MONTH_NAMES.get(name)]).toEqual([language, name, month]);
        }
      }
    }
  });

  it.each([
    ['2. Oktober 1951', '02.10.1951'],
    ['October 2, 1951', '02.10.1951'],
    ['2nd of October 1951', '02.10.1951'],
    ['2 de octubre de 1951', '02.10.1951'],
    ['1er octobre 1951', '01.10.1951'],
    ['2 ottobre 1951', '02.10.1951'],
    ['2 oktober 1951', '02.10.1951'],
    ['2 października 1951', '02.10.1951'],
    ['2 de outubro de 1951', '02.10.1951'],
    ['2 октября 1951 г.', '02.10.1951'],
    ['2 жовтня 1951 р.', '02.10.1951'],
    ['2. Okt. 1951', '02.10.1951'],
    ['Mai 1951', '05.1951'],
    ['um 2. Oktober 1951', 'um 02.10.1951'],
    ['about May 1951', 'about 05.1951'],
    ['Mai 1951 – 3. Juni 1960', '05.1951-03.06.1960'],
  ])('reads "%s" as %s', (written, numeric) => {
    expect(numericDate(written)).toBe(numeric);
    expect(parseFlexibleDate(written)).toEqual(parseFlexibleDate(numeric));
    expect(parseFlexibleDate(written).ok).toBe(true);
  });

  it('leaves numeric and unreadable input as it is', () => {
    expect(numericDate('04.01.1980')).toBe('04.01.1980');
    expect(numericDate('1980 – 1985')).toBe('1980 – 1985');
    expect(numericDate('Sommer 1951')).toBe('Sommer 1951');
    expect(parseFlexibleDate('31. Februar 1951')).toEqual({ ok: false, error: 'INVALID' });
    expect(parseFlexibleDate('2. Oktober')).toEqual({ ok: false, error: 'INVALID' });
  });
});
