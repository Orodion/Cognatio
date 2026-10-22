import { prismaMock } from '../../../test/prismaMock.js';
import { refreshEmptyPhonetics } from '../refreshPhonetics.js';
import { personPhonetics } from '../phonetics.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';

describe('refreshEmptyPhonetics', () => {
  it('computes the codes of persons stored without any and keeps the time of their last change', async () => {
    const changed = new Date('2026-01-02T03:04:05.000Z');
    prismaMock.person.findMany.mockResolvedValueOnce([
      { id: 'p1', firstName: 'Олена', middleName: null, lastName: 'Шевченко', birthName: null, nickname: null, updatedAt: changed },
      { id: 'p2', firstName: '123', middleName: null, lastName: null, birthName: null, nickname: null, updatedAt: changed },
    ] as never);
    const log = { info: jest.fn() };

    expect(await refreshEmptyPhonetics(prismaMock as unknown as PrismaClient, log)).toBe(1);

    expect(prismaMock.person.findMany.mock.calls[0][0]).toMatchObject({ where: { phonetics: { isEmpty: true } } });
    expect(prismaMock.person.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.person.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { phonetics: personPhonetics({ firstName: 'Олена', lastName: 'Шевченко' }), updatedAt: changed },
    });
    expect(log.info).toHaveBeenCalledWith('Phonetic codes computed again', { persons: 1 });
  });

  it('does nothing when every person has codes', async () => {
    prismaMock.person.findMany.mockResolvedValueOnce([]);
    const log = { info: jest.fn() };
    expect(await refreshEmptyPhonetics(prismaMock as unknown as PrismaClient, log)).toBe(0);
    expect(prismaMock.person.update).not.toHaveBeenCalled();
    expect(log.info).not.toHaveBeenCalled();
  });
});
