import { isSameRelation } from '../../resolvers/relationResolvers.js';
import type { TransferData, TransferEvent, TransferMedia, TransferNote, TransferPerson, TransferRelation } from './format.js';

export const STRATEGIES = ['OVERWRITE', 'MERGE_NEWER', 'MERGE_MANUAL'] as const;
export type Strategy = (typeof STRATEGIES)[number];
/** Decision per person with a conflict when merging manually */
export type Decision = 'IMPORT' | 'KEEP';

type PersonFields = Omit<TransferPerson, 'events' | 'notes' | 'media'>;

const PERSON_FIELDS = [
  'firstName',
  'lastName',
  'middleName',
  'birthName',
  'title',
  'nickname',
  'birthDate',
  'birthDatePrecision',
  'birthPlace',
  'gender',
  'deathDate',
  'deathDatePrecision',
  'deathPlace',
  'address',
  'phone',
  'email',
  'occupation',
  'hobbies',
  'maritalStatus',
  'nationality',
  'languages',
  'profilePictureId',
  'isDeleted',
] as const satisfies ReadonlyArray<keyof PersonFields>;
const EVENT_FIELDS = ['date', 'datePrecision', 'title', 'category', 'description', 'place', 'sortOrder', 'mediaIds'] as const;
const NOTE_FIELDS = ['text'] as const;
// The path inside the ZIP file is not content – it is assigned anew with every export
const MEDIA_FIELDS = ['originalFileName', 'mimeType', 'sizeBytes', 'type'] as const;
const RELATION_FIELDS = ['personAId', 'personBId', 'type', 'label', 'active', 'note', 'startDate', 'endDate'] as const;

const norm = (v: unknown) => (v === undefined || v === '' ? null : v);
const equal = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

function changedFields<T extends object>(existing: T, imported: T, fields: ReadonlyArray<keyof T>): Array<keyof T> {
  return fields.filter((f) => !equal(existing[f], imported[f]));
}

const time = (iso: string) => new Date(iso).getTime();
const personName = (p: { firstName: string; lastName?: string | null }) => [p.firstName, p.lastName].filter(Boolean).join(' ');

export interface FieldChange {
  /** Field name or area, e.g. "birthPlace", "event", "relation" */
  field: string;
  /** For events/notes/media/relations: title for display */
  label?: string;
  existing: unknown;
  imported: unknown;
}

export interface PersonConflict {
  personId: string;
  name: string;
  existingUpdatedAt: string;
  importedUpdatedAt: string;
  /** The imported data is newer (decisive for "newer wins") */
  importedNewer: boolean;
  changes: FieldChange[];
}

interface RecordDiff<T> {
  created: Array<{ personId: string; record: T }>;
  changed: Array<{ personId: string; record: T; existing: T }>;
}

export interface Analysis {
  existingPersons: number;
  importedPersons: number;
  newPersons: string[];
  unchangedPersons: string[];
  conflicts: PersonConflict[];
  /** Existing persons missing in the import file (only removed when overwriting) */
  onlyExisting: string[];
  persons: { created: TransferPerson[]; changed: Array<{ record: TransferPerson; existing: PersonFields }> };
  events: RecordDiff<TransferEvent>;
  notes: RecordDiff<TransferNote>;
  media: RecordDiff<TransferMedia>;
  relations: { created: TransferRelation[]; changed: Array<{ record: TransferRelation; existing: TransferRelation }>; duplicates: number };
}

/** Compares imported data with the existing data – identical records are recognised by their id. */
export function analyze(imported: TransferData, existing: TransferData): Analysis {
  const existingPersons = new Map(existing.persons.map((p) => [p.id, p]));
  const importedIds = new Set(imported.persons.map((p) => p.id));
  const conflicts = new Map<string, PersonConflict>();
  const result: Analysis = {
    existingPersons: existing.persons.length,
    importedPersons: imported.persons.length,
    newPersons: [],
    unchangedPersons: [],
    conflicts: [],
    onlyExisting: existing.persons.filter((p) => !importedIds.has(p.id)).map((p) => p.id),
    persons: { created: [], changed: [] },
    events: { created: [], changed: [] },
    notes: { created: [], changed: [] },
    media: { created: [], changed: [] },
    relations: { created: [], changed: [], duplicates: 0 },
  };

  const conflictOf = (imp: TransferPerson, ex: TransferPerson) => {
    let c = conflicts.get(imp.id);
    if (!c) {
      const newest = (p: TransferPerson) => Math.max(time(p.updatedAt), ...[...p.events, ...p.notes, ...p.media].map((r) => time(r.updatedAt)));
      c = {
        personId: imp.id,
        name: personName(imp),
        existingUpdatedAt: new Date(newest(ex)).toISOString(),
        importedUpdatedAt: new Date(newest(imp)).toISOString(),
        importedNewer: newest(imp) > newest(ex),
        changes: [],
      };
      conflicts.set(imp.id, c);
    }
    return c;
  };

  // Compare events, notes and media in one pass per kind
  const diffChildren = <T extends { id: string }>(
    imp: TransferPerson,
    ex: TransferPerson,
    kind: 'event' | 'note' | 'media',
    importedList: T[],
    existingList: T[],
    fields: ReadonlyArray<keyof T>,
    label: (r: T) => string,
    target: RecordDiff<T>,
  ) => {
    const byId = new Map(existingList.map((r) => [r.id, r]));
    for (const rec of importedList) {
      const old = byId.get(rec.id);
      if (!old) {
        target.created.push({ personId: imp.id, record: rec });
        continue;
      }
      const changed = changedFields(old, rec, fields);
      if (!changed.length) {
        continue;
      }
      target.changed.push({ personId: imp.id, record: rec, existing: old });
      conflictOf(imp, ex).changes.push({ field: kind, label: label(rec), existing: pick(old, changed), imported: pick(rec, changed) });
    }
  };

  for (const imp of imported.persons) {
    const ex = existingPersons.get(imp.id);
    if (!ex) {
      result.newPersons.push(imp.id);
      result.persons.created.push(imp);
      continue;
    }
    const changed = changedFields<PersonFields>(ex, imp, PERSON_FIELDS);
    if (changed.length) {
      result.persons.changed.push({ record: imp, existing: ex });
      const c = conflictOf(imp, ex);
      for (const f of changed) {
        c.changes.push({ field: f, existing: norm(ex[f]), imported: norm(imp[f]) });
      }
    }
    diffChildren(imp, ex, 'event', imp.events, ex.events, EVENT_FIELDS, (e) => e.title, result.events);
    diffChildren(imp, ex, 'note', imp.notes, ex.notes, NOTE_FIELDS, (n) => n.text.slice(0, 40), result.notes);
    diffChildren(imp, ex, 'media', imp.media, ex.media, MEDIA_FIELDS, (m) => m.originalFileName, result.media);
  }

  const existingRelations = new Map(existing.relations.map((r) => [r.id, r]));
  const personsById = new Map(imported.persons.map((p) => [p.id, p]));
  for (const rel of imported.relations) {
    const old = existingRelations.get(rel.id);
    if (!old) {
      // Do not create the same relation twice under another id (e.g. entered by hand before)
      const duplicate = existing.relations.some(
        (r) =>
          ((r.personAId === rel.personAId && r.personBId === rel.personBId) || (r.personAId === rel.personBId && r.personBId === rel.personAId)) &&
          // isSameRelation takes the recording direction into account (e.g. MOTHER of A = CHILD of B)
          isSameRelation(r, rel),
      );
      if (duplicate) {
        result.relations.duplicates++;
      } else {
        result.relations.created.push(rel);
      }
      continue;
    }
    const changed = changedFields(old, rel, RELATION_FIELDS);
    if (!changed.length) {
      continue;
    }
    result.relations.changed.push({ record: rel, existing: old });
    const owner = personsById.get(rel.personAId);
    const ownerExisting = existingPersons.get(rel.personAId);
    if (owner && ownerExisting) {
      conflictOf(owner, ownerExisting).changes.push({
        field: 'relation',
        label: personName(personsById.get(rel.personBId) ?? { firstName: rel.personBId }),
        existing: pick(old, changed),
        imported: pick(rel, changed),
      });
    }
  }

  result.conflicts = [...conflicts.values()];
  const conflictIds = new Set(conflicts.keys());
  result.unchangedPersons = imported.persons.filter((p) => existingPersons.has(p.id) && !conflictIds.has(p.id)).map((p) => p.id);
  return result;
}

function pick<T extends object>(obj: T, keys: Array<keyof T>): Partial<T> {
  return Object.fromEntries(keys.map((k) => [k, norm(obj[k])])) as Partial<T>;
}

export interface ImportPlan {
  strategy: Strategy;
  /** Replace the existing data completely */
  replaceAll: boolean;
  createPersons: TransferPerson[];
  updatePersons: TransferPerson[];
  createEvents: Array<{ personId: string; record: TransferEvent }>;
  updateEvents: Array<{ personId: string; record: TransferEvent }>;
  createNotes: Array<{ personId: string; record: TransferNote }>;
  updateNotes: Array<{ personId: string; record: TransferNote }>;
  createMedia: Array<{ personId: string; record: TransferMedia }>;
  updateMedia: Array<{ personId: string; record: TransferMedia }>;
  createRelations: TransferRelation[];
  updateRelations: TransferRelation[];
}

export interface PlanSummary {
  newPersons: number;
  updatedPersons: number;
  unchangedPersons: number;
  keptPersons: number;
  removedPersons: number;
  conflicts: number;
  newRelations: number;
  newEvents: number;
  newNotes: number;
  newMedia: number;
}

/**
 * Derives from the analysis what will be written.
 * - OVERWRITE: delete the existing data, import everything
 * - MERGE_NEWER: create new records; where data differs the newer state wins per record
 * - MERGE_MANUAL: create new records; for conflicts the user decides per person (no decision: keep)
 */
export function buildPlan(imported: TransferData, analysis: Analysis, strategy: Strategy, decisions: Record<string, Decision> = {}): ImportPlan {
  const plan: ImportPlan = {
    strategy,
    replaceAll: strategy === 'OVERWRITE',
    createPersons: [],
    updatePersons: [],
    createEvents: [],
    updateEvents: [],
    createNotes: [],
    updateNotes: [],
    createMedia: [],
    updateMedia: [],
    createRelations: [],
    updateRelations: [],
  };

  if (strategy === 'OVERWRITE') {
    plan.createPersons = imported.persons;
    for (const p of imported.persons) {
      plan.createEvents.push(...p.events.map((record) => ({ personId: p.id, record })));
      plan.createNotes.push(...p.notes.map((record) => ({ personId: p.id, record })));
      plan.createMedia.push(...p.media.map((record) => ({ personId: p.id, record })));
    }
    plan.createRelations = imported.relations;
    return plan;
  }

  const wins = (personId: string, importedAt: string, existingAt: string) =>
    strategy === 'MERGE_NEWER' ? time(importedAt) > time(existingAt) : decisions[personId] === 'IMPORT';

  plan.createPersons = analysis.persons.created;
  plan.updatePersons = analysis.persons.changed.filter((c) => wins(c.record.id, c.record.updatedAt, c.existing.updatedAt)).map((c) => c.record);

  // New sub-records of new persons are part of persons.created; only add those of existing persons here
  const newPersonIds = new Set(analysis.newPersons);
  for (const p of analysis.persons.created) {
    plan.createEvents.push(...p.events.map((record) => ({ personId: p.id, record })));
    plan.createNotes.push(...p.notes.map((record) => ({ personId: p.id, record })));
    plan.createMedia.push(...p.media.map((record) => ({ personId: p.id, record })));
  }
  const merge = <T extends { updatedAt: string }>(
    diff: RecordDiff<T>,
    create: Array<{ personId: string; record: T }>,
    update: Array<{ personId: string; record: T }>,
  ) => {
    for (const c of diff.created) {
      if (!newPersonIds.has(c.personId)) {
        create.push(c);
      }
    }
    for (const c of diff.changed) {
      if (wins(c.personId, c.record.updatedAt, c.existing.updatedAt)) {
        update.push(c);
      }
    }
  };
  merge(analysis.events, plan.createEvents, plan.updateEvents);
  merge(analysis.notes, plan.createNotes, plan.updateNotes);
  merge(analysis.media, plan.createMedia, plan.updateMedia);

  plan.createRelations = analysis.relations.created;
  plan.updateRelations = analysis.relations.changed.filter((c) => wins(c.record.personAId, c.record.updatedAt, c.existing.updatedAt)).map((c) => c.record);
  return plan;
}

/** Numbers for the summary before confirming */
export function summarize(analysis: Analysis, plan: ImportPlan): PlanSummary {
  const updated = new Set([
    ...plan.updatePersons.map((p) => p.id),
    ...[...plan.updateEvents, ...plan.updateNotes, ...plan.updateMedia].map((c) => c.personId),
    ...plan.updateRelations.map((r) => r.personAId),
  ]);
  if (plan.replaceAll) {
    return {
      newPersons: analysis.importedPersons,
      updatedPersons: 0,
      unchangedPersons: 0,
      keptPersons: 0,
      removedPersons: analysis.existingPersons,
      conflicts: 0,
      newRelations: plan.createRelations.length,
      newEvents: plan.createEvents.length,
      newNotes: plan.createNotes.length,
      newMedia: plan.createMedia.length,
    };
  }
  return {
    newPersons: plan.createPersons.length,
    updatedPersons: updated.size,
    unchangedPersons: analysis.unchangedPersons.length,
    keptPersons: analysis.conflicts.filter((c) => !updated.has(c.personId)).length,
    removedPersons: 0,
    conflicts: analysis.conflicts.length,
    newRelations: plan.createRelations.length,
    newEvents: plan.createEvents.length,
    newNotes: plan.createNotes.length,
    newMedia: plan.createMedia.length,
  };
}
