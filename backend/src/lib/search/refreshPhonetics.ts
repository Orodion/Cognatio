import type { PrismaClient } from '../../generated/prisma/client.js';
import type { Logger } from '../logger.js';
import { personPhonetics } from './phonetics.js';

/**
 * Persons without a phonetic code get it computed again at the start. Before 1.1 the phonetics knew only Latin
 * letters, so persons whose names are written in Cyrillic were stored without any code; a person whose name has no
 * letters at all still has none afterwards (and is checked again at the next start – there are few of them).
 */
export async function refreshEmptyPhonetics(db: Pick<PrismaClient, 'person'>, log: Pick<Logger, 'info'>): Promise<number> {
  const persons = await db.person.findMany({
    where: { phonetics: { isEmpty: true } },
    select: { id: true, firstName: true, middleName: true, lastName: true, birthName: true, nickname: true, updatedAt: true },
  });
  let updated = 0;
  for (const person of persons) {
    const phonetics = personPhonetics(person);
    if (phonetics.length) {
      // Not a change of the person: the time of the last change stays (it decides merges on import)
      await db.person.update({ where: { id: person.id }, data: { phonetics, updatedAt: person.updatedAt } });
      updated++;
    }
  }
  if (updated) {
    log.info('Phonetic codes computed again', { persons: updated });
  }
  return updated;
}
