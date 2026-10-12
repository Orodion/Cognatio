import { isoTime, isoTimes } from '../timestamps.js';

describe('isoTime', () => {
  it('turns dates, milliseconds and ISO texts into ISO timestamps', () => {
    expect(isoTime(new Date('2026-10-11T08:30:00.000Z'))).toBe('2026-10-11T08:30:00.000Z');
    expect(isoTime(1_700_000_000_000)).toBe('2023-11-14T22:13:20.000Z');
    expect(isoTime('1700000000000')).toBe('2023-11-14T22:13:20.000Z');
    expect(isoTime('2026-10-11T08:30:00.000Z')).toBe('2026-10-11T08:30:00.000Z');
  });

  it('keeps missing and unreadable values empty', () => {
    expect(isoTime(null)).toBeNull();
    expect(isoTime(undefined)).toBeNull();
    expect(isoTime('')).toBeNull();
    expect(isoTime('not a date')).toBeNull();
  });
});

describe('isoTimes', () => {
  it('builds one field resolver per field', () => {
    const resolvers = isoTimes('createdAt', 'deletedAt');
    expect(Object.keys(resolvers)).toEqual(['createdAt', 'deletedAt']);
    expect(resolvers.createdAt({ createdAt: new Date(0) })).toBe('1970-01-01T00:00:00.000Z');
    expect(resolvers.deletedAt({ deletedAt: null })).toBeNull();
  });
});
