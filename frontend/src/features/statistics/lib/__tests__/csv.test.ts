import { describe, it, expect } from 'vitest';
import { toCsv } from '../csv';

describe('toCsv', () => {
  it('separates cells by tabs and writes numbers as the language does', () => {
    expect(
      toCsv(
        [
          ['Ort', 'Anteil'],
          ['Köln', 0.5],
          ['Bonn', 1234],
        ],
        'de',
      ),
    ).toBe('Ort\tAnteil\r\nKöln\t0,5\r\nBonn\t1234');
    expect(
      toCsv(
        [
          ['Place', 'Share'],
          ['Smith, John', 0.5],
        ],
        'en',
      ),
    ).toBe('Place\tShare\r\nSmith, John\t0.5');
  });

  it('keeps every cell in its place and leaves empty cells empty', () => {
    expect(toCsv([['Halle;\tSaale', 'Der "Alte"', null, 'a\r\nb', undefined]], 'de')).toBe('Halle; Saale\tDer "Alte"\t\ta b\t');
  });

  it('keeps a text that starts like a formula as text, but not a negative number', () => {
    expect(toCsv([['=HYPERLINK("x")', '+49', '-', '@a', -3, 'Anna']], 'en')).toBe(`'=HYPERLINK("x")\t'+49\t'-\t'@a\t-3\tAnna`);
  });
});
