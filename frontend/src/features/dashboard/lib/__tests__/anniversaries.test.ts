import { describe, it, expect } from 'vitest';
import { makePerson } from '@/test/fixtures';
import { upcomingAnniversaries, type AnniversaryRelation } from '../anniversaries';

// 15 October 2026, in the afternoon
const now = new Date(2026, 9, 15, 15, 30);
const summary = (persons: Array<ReturnType<typeof makePerson>>, relations: AnniversaryRelation[] = [], at = now, days?: number) =>
  upcomingAnniversaries(persons, relations, at, days).map((a) => `${a.kind} ${a.persons.map((p) => p.id).join('+')} ${a.inDays} ${a.years}`);

describe('upcomingAnniversaries', () => {
  it('lists birthdays of the living, birthdays of the deceased and days of death, soonest first', () => {
    expect(
      summary([
        makePerson({ id: 'living', birthDate: '20.10.1980' }),
        makePerson({ id: 'today', birthDate: '15.10.2000' }),
        makePerson({ id: 'dead', birthDate: '16.10.1900', deathDate: '01.11.1970' }),
      ]),
    ).toEqual(['BIRTHDAY today 0 26', 'BIRTH dead 1 126', 'BIRTHDAY living 5 46', 'DEATH dead 17 56']);
  });

  it('counts only exact dates and only the coming days', () => {
    expect(
      summary([
        makePerson({ id: 'month', birthDate: '10.1980' }),
        makePerson({ id: 'about', birthDate: 'um 1980' }),
        makePerson({ id: 'range', birthDate: '1980-1985' }),
        makePerson({ id: 'past', birthDate: '14.10.1980' }),
        makePerson({ id: 'late', birthDate: '14.11.1980' }),
        makePerson({ id: 'iso', birthDate: '1980-10-17' }),
      ]),
    ).toEqual(['BIRTHDAY iso 2 46']);
  });

  it('treats a person without a date of death older than the plausible age as deceased', () => {
    expect(summary([makePerson({ id: 'old', birthDate: '20.10.1850' })])).toEqual(['BIRTH old 5 176']);
  });

  it('skips a birth this very day and looks into the next year at the end of the year', () => {
    expect(summary([makePerson({ id: 'new', birthDate: '15.10.2026' })])).toEqual([]);
    expect(summary([makePerson({ id: 'jan', birthDate: '02.01.1990' })], [], new Date(2026, 11, 20))).toEqual(['BIRTHDAY jan 13 37']);
  });

  it('celebrates 29 February on 28 February in other years', () => {
    expect(summary([makePerson({ id: 'leap', birthDate: '29.02.2000' })], [], new Date(2027, 1, 20))).toEqual(['BIRTHDAY leap 8 27']);
    expect(summary([makePerson({ id: 'leap', birthDate: '29.02.2000' })], [], new Date(2028, 1, 20))).toEqual(['BIRTHDAY leap 9 28']);
  });

  it('lists the wedding day of a married couple once, from the start of the relation', () => {
    const anna = makePerson({ id: 'anna' });
    const ben = makePerson({ id: 'ben', firstName: 'Ben' });
    const cara = makePerson({ id: 'cara', firstName: 'Cara' });
    const relations: AnniversaryRelation[] = [
      { id: 'r1', personAId: 'anna', personBId: 'ben', type: 'HUSBAND', active: true, startDate: '1990-10-18T00:00:00.000Z' },
      { id: 'r2', personAId: 'ben', personBId: 'anna', type: 'WIFE', active: true, startDate: '1990-10-18T00:00:00.000Z' },
      // Milliseconds as text, as the API may send them
      { id: 'r3', personAId: 'ben', personBId: 'cara', type: 'WIFE', active: false, startDate: String(Date.UTC(1970, 9, 20)) },
      { id: 'r4', personAId: 'anna', personBId: 'cara', type: 'LIFE_PARTNER', active: true, startDate: '2000-10-20T00:00:00.000Z' },
      { id: 'r5', personAId: 'cara', personBId: 'gone', type: 'HUSBAND', active: true, startDate: '2000-10-20T00:00:00.000Z' },
    ];
    expect(summary([anna, ben, cara], relations)).toEqual(['WEDDING anna+ben 3 36']);
  });

  it('reads the start of a relation as a day in UTC', () => {
    const relations: AnniversaryRelation[] = [{ id: 'r', personAId: 'a', personBId: 'b', type: 'HUSBAND', startDate: String(Date.UTC(2000, 9, 16)) }];
    expect(summary([makePerson({ id: 'a' }), makePerson({ id: 'b' })], relations)).toEqual(['WEDDING a+b 1 26']);
  });
});
