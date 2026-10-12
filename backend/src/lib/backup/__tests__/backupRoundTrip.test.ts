/**
 * Every field of every table survives a backup: create → read → restore gives exactly the same rows.
 * The fields come from prisma/schema.prisma, so a new column or table that the backup forgets makes this
 * test fail. The backup is the bridge for moving data (to another computer, later to the mobile app) and the
 * safety copy before migrations, so nothing may get lost on the way.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognatio-roundtrip-'));
jest.mock('../../files/uploads.js', () => ({ uploadDir: tmpDir }));

import { createBackup, readBackup, restoreBackup } from '../backup.js';

afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

interface Field {
  name: string;
  type: string;
  list: boolean;
}

/** Scalar fields per model from the Prisma schema (relation fields point to other models and are skipped) */
function schemaModels(): Map<string, Field[]> {
  const schema = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
  const blocks = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const names = new Set(blocks.map(([, name]) => name));
  return new Map(
    blocks.map(([, name, body]) => [
      name,
      body
        .split('\n')
        .map((line) => line.trim().match(/^(\w+)\s+(\w+)(\[\])?\??/))
        .filter((match): match is RegExpMatchArray => !!match && !names.has(match[2]))
        .map(([, field, type, list]) => ({ name: field, type, list: !!list })),
    ]),
  );
}

/** Model → key in the backup (data.json) */
const TABLES: Record<string, string> = {
  FamilyTree: 'familyTrees',
  Person: 'persons',
  Relation: 'relations',
  Event: 'events',
  Note: 'notes',
  Media: 'media',
  EventMedia: 'eventMedia',
  ImportRecord: 'imports',
};

/** References between the tables, so the integrity check of the backup accepts the data */
const REFERENCES: Record<string, string> = {
  familyTreeId: 't1',
  personId: 'p1',
  personAId: 'p1',
  personBId: 'p2',
  eventId: 'e1',
  mediaId: 'm1',
  profilePictureId: 'm1',
  fileName: 'photo.jpg',
};
const IDS: Record<string, string> = { FamilyTree: 't1', Person: 'p1', Relation: 'r1', Event: 'e1', Note: 'n1', Media: 'm1', ImportRecord: 'i1' };

/** A value that differs from every default: optional fields are filled, so a dropped field shows up */
function value(model: string, field: Field, index: number) {
  if (field.name === 'id') {
    return IDS[model];
  }
  if (field.name in REFERENCES) {
    return REFERENCES[field.name];
  }
  const scalar = (() => {
    switch (field.type) {
      case 'String':
        return `${model}.${field.name}`;
      case 'Int':
        return 7 + index;
      case 'Boolean':
        return true;
      case 'DateTime':
        return new Date(Date.UTC(2020, 0, 1 + index, 12));
      default:
        throw new Error(`Type ${field.type} of ${model}.${field.name} is not covered by this test – please add it`);
    }
  })();
  return field.list ? [scalar, `${scalar}-2`] : scalar;
}

function fullData() {
  const data: Record<string, Array<Record<string, unknown>>> = {};
  for (const [model, fields] of schemaModels()) {
    const row = Object.fromEntries(fields.map((field, index) => [field.name, value(model, field, index)]));
    // A second person for relations, and a family tree outside the recycle bin (a backup needs one)
    const extra: Record<string, Record<string, unknown>> = {
      Person: { ...row, id: 'p2', profilePictureId: null },
      FamilyTree: { ...row, id: 't2', isDeleted: false, deletedAt: null },
    };
    data[TABLES[model]] = extra[model] ? [row, extra[model]] : [row];
  }
  return data;
}

function fakeDb(data: Record<string, unknown[]>) {
  const inserted: Record<string, unknown[]> = {};
  const table = (name: string) => ({
    findMany: jest.fn(async () => data[name] ?? []),
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async ({ data: rows }: { data: unknown[] }) => {
      (inserted[name] ??= []).push(...rows);
      return { count: rows.length };
    }),
  });
  const db = Object.fromEntries(Object.entries(TABLES).map(([model, key]) => [model.charAt(0).toLowerCase() + model.slice(1), table(key)]));
  return { db: { ...db, $transaction: jest.fn(async (fn: (tx: typeof db) => unknown) => fn(db)) } as never, inserted };
}

describe('backup round trip', () => {
  it('covers every table of the schema', () => {
    expect([...schemaModels().keys()].sort()).toEqual(Object.keys(TABLES).sort());
  });

  it('keeps every field of every table, including optional fields and lists', async () => {
    fs.writeFileSync(path.join(tmpDir, 'photo.jpg'), 'image');
    const original = fullData();

    const { buffer } = await createBackup(fakeDb(original).db);
    const target = fakeDb({});
    await restoreBackup(target.db, readBackup(buffer));

    for (const key of Object.values(TABLES)) {
      expect({ table: key, rows: target.inserted[key] }).toEqual({ table: key, rows: original[key] });
    }
    expect(fs.readFileSync(path.join(tmpDir, 'photo.jpg'), 'utf8')).toBe('image');
  });
});
