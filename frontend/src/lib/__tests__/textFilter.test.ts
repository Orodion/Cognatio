import { describe, it, expect } from 'vitest';
import { filterTerms, highlightRanges, matchesFilter } from '../textFilter';

describe('filterTerms', () => {
  it('splits into folded words and drops empty ones', () => {
    expect(filterTerms('  Hoch  ZEIT ')).toEqual(['hoch', 'zeit']);
    expect(filterTerms('   ')).toEqual([]);
  });
});

describe('matchesFilter', () => {
  it('matches everything for an empty query', () => {
    expect(matchesFilter(['Geburt'], '')).toBe(true);
    expect(matchesFilter([], '  ')).toBe(true);
  });

  it('ignores case and accents', () => {
    expect(matchesFilter(['Hochzeit in München'], 'MUNCHEN')).toBe(true);
    expect(matchesFilter(['Café'], 'cafe')).toBe(true);
    expect(matchesFilter(['Cafe'], 'café')).toBe(true);
    expect(matchesFilter(['Straße'], 'strasse')).toBe(true);
  });

  it('finds a part of a word', () => {
    expect(matchesFilter(['Geburtstag'], 'geburt')).toBe(true);
    expect(matchesFilter(['Geburt'], 'geburtstag')).toBe(false);
  });

  it('needs all words, in any of the texts', () => {
    expect(matchesFilter(['Hochzeit', 'München', null, undefined], 'hochzeit münchen')).toBe(true);
    expect(matchesFilter(['Hochzeit', 'München'], 'hochzeit köln')).toBe(false);
  });
});

describe('highlightRanges', () => {
  it('returns the places in the original text', () => {
    expect(highlightRanges('Hochzeit in München', 'in')).toEqual([[9, 11]]);
    expect(highlightRanges('Anna und Hanna', 'an')).toEqual([
      [0, 2],
      [10, 12],
    ]);
    expect(highlightRanges('Geburt', 'GEB')).toEqual([[0, 3]]);
  });

  it('merges words that overlap or touch', () => {
    expect(highlightRanges('Geburtstag', 'geb burt')).toEqual([[0, 6]]);
    expect(highlightRanges('Geburtstag', 'burt urts')).toEqual([[2, 7]]);
  });

  it('keeps the positions of the original with accents and "ß"', () => {
    // "ü" is one character in the original although it is folded
    expect(highlightRanges('München', 'unchen')).toEqual([[1, 7]]);
    // "ß" is folded to "ss" but is one character in the original
    expect(highlightRanges('Straße', 'strasse')).toEqual([[0, 6]]);
    expect(highlightRanges('Straße', 'ras')).toEqual([[2, 5]]);
    // decomposed form: "u" + combining diaeresis
    expect(highlightRanges('München', 'munchen')).toEqual([[0, 8]]);
  });

  it('is empty without text, query or hit', () => {
    expect(highlightRanges('', 'a')).toEqual([]);
    expect(highlightRanges('Geburt', '')).toEqual([]);
    expect(highlightRanges('Geburt', 'taufe')).toEqual([]);
  });
});
