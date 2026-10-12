import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import i18n from '@/i18n';
import {
  comparePersonNames,
  formatPersonName,
  formatPersonOption,
  formatShortName,
  formatLifeDates,
  getInitials,
  calculateAge,
  formatFieldValue,
  isDeceased,
} from '../personUtils';
import type { Person } from '@/features/persons/types/person';

describe('personUtils', () => {
  describe('isDeceased', () => {
    it('is true with a date or a place of death', () => {
      expect(isDeceased({ deathDate: '1999' })).toBe(true);
      expect(isDeceased({ deathPlace: 'Köln' })).toBe(true);
    });

    it('is false without death data or with blanks only', () => {
      expect(isDeceased({})).toBe(false);
      expect(isDeceased({ deathDate: '  ', deathPlace: null })).toBe(false);
    });
  });

  describe('formatPersonName', () => {
    // The birth name suffix is translated – check the German form here
    beforeAll(async () => {
      await i18n.changeLanguage('de');
    });
    afterAll(async () => {
      await i18n.changeLanguage('cimode');
    });

    it('formats a complete name', () => {
      const person = { firstName: 'Anna', lastName: 'Müller', middleName: 'Maria', birthName: 'Schmidt', title: 'Dr.' } as Person;
      expect(formatPersonName(person)).toBe('Dr. Anna Maria Müller (geb. Schmidt)');
    });

    it('translates the birth name suffix', async () => {
      await i18n.changeLanguage('en');
      const person = { firstName: 'Anna', lastName: 'Müller', birthName: 'Schmidt' } as Person;
      expect(formatPersonName(person)).toBe('Anna Müller (née Schmidt)');
      await i18n.changeLanguage('de');
    });

    it('shows a missing given name as unknown in the current language', async () => {
      const person = { firstName: '(Vorname unbekannt)', lastName: 'Brakenhof' } as Person;
      expect(formatPersonName(person)).toBe('(Vorname unbekannt) Brakenhof');
      expect(formatShortName({ firstName: '(Vorname unbekannt)', lastName: 'Wardenskij' })).toBe('(Vorname unbekannt) Wardenskij');
      expect(getInitials(person)).toBe('B');
      await i18n.changeLanguage('en');
      expect(formatPersonName({ firstName: '(Vorname unbekannt)', lastName: 'Brakenhof' } as Person)).toBe('(first name unknown) Brakenhof');
      await i18n.changeLanguage('de');
    });

    it('sorts persons without a known given name last', () => {
      const names = [
        { firstName: '', lastName: 'Brakenhof' },
        { firstName: 'Adam', lastName: 'Weber' },
        { firstName: '(Vorname unbekannt)', lastName: 'Abel' },
        { firstName: 'Zoe', lastName: 'Berg' },
      ] as Person[];
      expect([...names].sort(comparePersonNames).map(formatPersonName)).toEqual([
        'Adam Weber',
        'Zoe Berg',
        '(Vorname unbekannt) Abel',
        '(Vorname unbekannt) Brakenhof',
      ]);
    });

    it('formats just a first name', () => {
      const person = { firstName: 'Anna' } as Person;
      expect(formatPersonName(person)).toBe('Anna');
    });
  });

  describe('formatLifeDates', () => {
    it('formats birth and death year', () => {
      const person = { birthDate: '1900-05-10', deathDate: '1980-11-20' } as Person;
      expect(formatLifeDates(person)).toBe('1900 - 1980');
    });

    it('formats only birth year', () => {
      const person = { birthDate: '1990-01-01' } as Person;
      expect(formatLifeDates(person)).toBe('* 1990');
    });
  });

  describe('getInitials', () => {
    it('returns initials correctly', () => {
      expect(getInitials({ firstName: 'Anna', lastName: 'Müller' })).toBe('AM');
      expect(getInitials({ firstName: 'Max' })).toBe('M');
      const result = getInitials({} as unknown as Pick<Person, 'firstName' | 'lastName'>);
      expect(result).toBe('?');
    });
  });

  describe('calculateAge', () => {
    it('calculates age for deceased', () => {
      expect(calculateAge('1900-01-01', '1980-01-01')).toBe(80);
    });

    it('returns null if no birth date', () => {
      expect(calculateAge(null, '1980-01-01')).toBeNull();
    });
  });

  describe('formatFieldValue', () => {
    it('formats string or null correctly', () => {
      expect(formatFieldValue('Test')).toBe('Test');
      expect(formatFieldValue(null)).toBe('—');
      expect(formatFieldValue(['Deutsch', 'Englisch'])).toBe('Deutsch, Englisch');
      expect(formatFieldValue([])).toBe('—');
    });
  });
});

describe('formatPersonOption', () => {
  const base = { title: null, firstName: 'Max', middleName: null, lastName: 'Mustermann', birthName: null };

  it('adds the birth date so persons with the same name can be told apart', () => {
    expect(formatPersonOption({ ...base, birthDate: '04.01.1980' })).toBe('Max Mustermann (* 04.01.1980)');
    expect(formatPersonOption({ ...base, birthDate: 'um 1906' })).toBe('Max Mustermann (* um 1906)');
  });

  it('shows only the name without birth date', () => {
    expect(formatPersonOption({ ...base, birthDate: null })).toBe('Max Mustermann');
  });
});
