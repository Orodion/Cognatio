import { describe, it, expect } from 'vitest';
import { suggestedStartDate } from '../relationDates';

describe('suggestedStartDate', () => {
  it('starts parent-child relations with the birth of the child', () => {
    // The selected person is a child of the current one
    expect(suggestedStartDate('CHILD', '01.01.1950', '04.01.1980')).toBe('1980-01-04');
    // The selected person is mother/father of the current one – the child is the current person
    expect(suggestedStartDate('MOTHER', '13.02.1985', '01.01.1960')).toBe('1985-02-13');
    expect(suggestedStartDate('FATHER', '13.02.1985', null)).toBe('1985-02-13');
  });

  it('suggests nothing for other relations or inexact birth dates', () => {
    expect(suggestedStartDate('WIFE', '13.02.1985', '04.01.1980')).toBe('');
    expect(suggestedStartDate('CHILD', null, 'um 1980')).toBe('');
    expect(suggestedStartDate('CHILD', null, '1980')).toBe('');
    expect(suggestedStartDate('CHILD', null, undefined)).toBe('');
  });
});
