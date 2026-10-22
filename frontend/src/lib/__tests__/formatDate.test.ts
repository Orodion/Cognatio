import { formatDate, formatDateTime, formatDay } from '../formatDate';

describe('formatDay', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('shows a day stored as midnight UTC as the same day west of UTC', () => {
    // Brazil (UTC-3): local time of 1950-05-01T00:00Z is still 30 April
    process.env.TZ = 'America/Sao_Paulo';
    expect(formatDay('1950-05-01T00:00:00.000Z', 'de')).toBe('01.05.1950');
    expect(formatDay('1950-05-01', 'pt-BR')).toBe('01/05/1950');
  });

  it('gives an empty text for an unreadable value', () => {
    expect(formatDay('kein Datum', 'de')).toBe('');
    expect(formatDate('kein Datum', 'de')).toBe('');
    expect(formatDateTime('kein Datum', 'de')).toBe('');
  });
});
