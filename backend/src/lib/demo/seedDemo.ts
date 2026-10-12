import fs from 'node:fs';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { dataDirPath } from '../files/dataDir.js';
import type { Logger } from '../logger.js';
import { applyPlan } from '../transfer/applyPlan.js';
import { emptyTransfer } from '../transfer/foreignIds.js';
import { analyze, buildPlan } from '../transfer/plan.js';
import { readImportFile } from '../transfer/readImport.js';

/** Name and description that the example family tree gets when it is created */
export const DEMO_TREE_NAME = 'Familie Kraft (Demo)';
export const DEMO_TREE_DESCRIPTION =
  'Erfundener Beispiel-Stammbaum zum Ausprobieren: vier Generationen einer Familie aus München. Alle Personen und Texte sind frei erfunden, die Fotos sind KI-generiert.';

/** File in the data folder: the example was offered once, so it does not come back after the user has deleted it */
export const DEMO_MARKER = 'demo-offered';

type Log = Logger;

/**
 * First start of the desktop app: the example family tree "Familie Kraft" (file in COGNATIO_DEMO_FILE) is created in an
 * empty database, so the app does not open with nothing (otherwise it would offer to create or import a family tree).
 * It happens only once per installation: a marker file in the data folder
 * remembers it, also when the user later deletes the example. A failure is logged and never stops the start.
 * Returns whether the example was created.
 */
export async function seedDemoTree(prisma: PrismaClient, env: NodeJS.ProcessEnv, log: Log): Promise<boolean> {
  const file = env.COGNATIO_DEMO_FILE?.trim();
  const marker = dataDirPath(env, DEMO_MARKER);
  if (!file || !marker || fs.existsSync(marker)) {
    return false;
  }
  try {
    if (!fs.existsSync(file)) {
      log.warn('Example family tree not found', { file });
      return false;
    }
    // Any family tree (also one in the recycle bin) means the app has been used before
    const trees = await prisma.familyTree.count();
    let created = false;
    if (trees === 0) {
      const imported = readImportFile(fs.readFileSync(file), 'Cognatio-Demo.zip');
      const plan = buildPlan(imported.data, analyze(imported.data, emptyTransfer()), 'OVERWRITE', {});
      const result = await applyPlan(prisma, plan, imported.files, { newTreeName: DEMO_TREE_NAME });
      await prisma.familyTree.update({ where: { id: result.familyTreeId }, data: { description: DEMO_TREE_DESCRIPTION } });
      log.info('Example family tree created', { persons: result.createdPersons, media: result.createdMedia });
      created = true;
    }
    fs.writeFileSync(marker, `${new Date().toISOString()}\n`);
    return created;
  } catch (err) {
    log.error('Example family tree could not be created', { err });
    // Not tried again at every start: a broken file would only repeat the error
    try {
      fs.writeFileSync(marker, `failed ${new Date().toISOString()}\n`);
    } catch {
      // the data folder is not writable – the app has bigger problems
    }
    return false;
  }
}
