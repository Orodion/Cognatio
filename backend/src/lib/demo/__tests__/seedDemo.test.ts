import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('../../transfer/applyPlan.js', () => ({ applyPlan: jest.fn() }));

import { applyPlan } from '../../transfer/applyPlan.js';
import { readImportFile } from '../../transfer/readImport.js';
import { DEMO_MARKER, DEMO_TREE_DESCRIPTION, DEMO_TREE_NAME, seedDemoTree } from '../seedDemo.js';
import { prismaMock } from '../../../test/prismaMock.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';

// The example family tree that is shipped with the app (see demo/README.md)
const demoFile = path.resolve(__dirname, '../../../../../demo/Cognatio-Demo-Familie-Kraft.zip');
const prisma = prismaMock as unknown as PrismaClient;
const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as never;

let dataDir: string;
const env = (extra: NodeJS.ProcessEnv = {}) => ({ COGNATIO_DATA_DIR: dataDir, COGNATIO_DEMO_FILE: demoFile, ...extra });
const marker = () => path.join(dataDir, DEMO_MARKER);

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-demo-'));
  (applyPlan as jest.Mock).mockResolvedValue({ familyTreeId: 'tree-demo', createdPersons: 10, createdMedia: 19 });
});
afterEach(() => fs.rmSync(dataDir, { recursive: true, force: true }));

/** The example file as the app reads it (only the records; the media are listed) */
async function readDemo() {
  const file = await readImportFile(demoFile, 'demo.zip');
  file.close();
  return file;
}

describe('the shipped example file', () => {
  it('is a valid Cognatio export with the whole story', async () => {
    const { data, files } = await readDemo();
    expect(data.persons).toHaveLength(10);
    expect(data.relations).toHaveLength(15);
    expect(data.persons.flatMap((p) => p.events)).toHaveLength(32);
    expect(data.persons.flatMap((p) => p.notes)).toHaveLength(9);
    const media = data.persons.flatMap((p) => p.media);
    expect(media).toHaveLength(19);
    // every file is in the ZIP and the profile picture is set
    expect(media.every((m) => files.has(m.path))).toBe(true);
    expect(data.persons.find((p) => p.firstName === 'Thomas')?.profilePictureId).toBeTruthy();
  });

  it('contains no date in the future (the app rejects those)', async () => {
    const { data } = await readDemo();
    const years = data.persons
      .flatMap((p) => [p.birthDate, p.deathDate, ...p.events.map((e) => e.date)])
      .flatMap((d) => (d ? [...d.matchAll(/\d{4}/g)].map((m) => Number(m[0])) : []));
    expect(Math.max(...years)).toBeLessThanOrEqual(new Date().getFullYear());
  });
});

describe('the events of the shipped example file', () => {
  it('carry the sort order of their date, so the timeline is chronological', async () => {
    const { data } = await readDemo();
    const thomas = data.persons.find((p) => p.firstName === 'Thomas');
    const keys = (thomas?.events ?? []).map((e) => e.sortOrder);
    expect(keys.every((key) => typeof key === 'number')).toBe(true);
    // the birth is the oldest event; the death comes right before the farewell ceremony, which is the youngest
    const key = (title: string) => thomas?.events.find((e) => e.title === title)?.sortOrder as number;
    const all = keys as number[];
    expect(key('Geburt')).toBe(Math.min(...all));
    expect(key('Abschiedsfeier')).toBe(Math.max(...all));
    expect(key('Tod')).toBeLessThan(key('Abschiedsfeier'));
    expect(all.filter((k) => k > key('Tod'))).toEqual([key('Abschiedsfeier')]);
  });
});

describe('seedDemoTree', () => {
  it('creates the example in an empty database, names it and remembers it', async () => {
    prismaMock.familyTree.count.mockResolvedValue(0);

    await expect(seedDemoTree(prisma, env(), log)).resolves.toBe(true);

    const [, plan, , target] = (applyPlan as jest.Mock).mock.calls[0];
    expect(target).toEqual({ newTreeName: DEMO_TREE_NAME });
    expect(plan.createPersons).toHaveLength(10);
    expect(prismaMock.familyTree.update).toHaveBeenCalledWith({ where: { id: 'tree-demo' }, data: { description: DEMO_TREE_DESCRIPTION } });
    expect(fs.existsSync(marker())).toBe(true);
  });

  it('leaves a database that has been used alone, but still sets the marker', async () => {
    prismaMock.familyTree.count.mockResolvedValue(1);

    await expect(seedDemoTree(prisma, env(), log)).resolves.toBe(false);

    expect(applyPlan).not.toHaveBeenCalled();
    expect(fs.existsSync(marker())).toBe(true);
  });

  it('does nothing a second time (the user may have deleted the example)', async () => {
    fs.writeFileSync(marker(), 'x');
    prismaMock.familyTree.count.mockResolvedValue(0);

    await expect(seedDemoTree(prisma, env(), log)).resolves.toBe(false);

    expect(prismaMock.familyTree.count).not.toHaveBeenCalled();
    expect(applyPlan).not.toHaveBeenCalled();
  });

  it('does nothing without the file setting or the data folder (development, server)', async () => {
    prismaMock.familyTree.count.mockResolvedValue(0);

    await expect(seedDemoTree(prisma, { COGNATIO_DATA_DIR: dataDir }, log)).resolves.toBe(false);
    await expect(seedDemoTree(prisma, { COGNATIO_DEMO_FILE: demoFile }, log)).resolves.toBe(false);

    expect(applyPlan).not.toHaveBeenCalled();
    expect(fs.existsSync(marker())).toBe(false);
  });

  it('warns about a missing file and tries again at the next start', async () => {
    await expect(seedDemoTree(prisma, env({ COGNATIO_DEMO_FILE: path.join(dataDir, 'missing.zip') }), log)).resolves.toBe(false);

    expect(fs.existsSync(marker())).toBe(false);
  });

  it('never stops the start: an unreadable file or a failed import is logged and not repeated', async () => {
    prismaMock.familyTree.count.mockResolvedValue(0);
    const broken = path.join(dataDir, 'broken.zip');
    fs.writeFileSync(broken, 'no zip');

    await expect(seedDemoTree(prisma, env({ COGNATIO_DEMO_FILE: broken }), log)).resolves.toBe(false);

    expect(fs.readFileSync(marker(), 'utf8')).toMatch(/^failed /);
    expect(applyPlan).not.toHaveBeenCalled();
  });
});
