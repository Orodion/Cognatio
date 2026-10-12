import path from 'path';
import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ensureUploadDir, removeUploadedFile, uploadDir, writeUploadedFile } from '../files/uploads.js';
import type { TransferEvent, TransferMedia, TransferNote, TransferPerson, TransferRelation } from './format.js';
import type { ImportPlan } from './plan.js';
import { personPhonetics } from '../search/phonetics.js';

const date = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

function personData(p: TransferPerson) {
  return {
    phonetics: personPhonetics(p),
    firstName: p.firstName,
    lastName: p.lastName ?? null,
    middleName: p.middleName ?? null,
    birthName: p.birthName ?? null,
    title: p.title ?? null,
    nickname: p.nickname ?? null,
    birthDate: p.birthDate ?? null,
    birthDatePrecision: p.birthDatePrecision ?? null,
    birthPlace: p.birthPlace ?? null,
    gender: p.gender,
    deathDate: p.deathDate ?? null,
    deathDatePrecision: p.deathDatePrecision ?? null,
    deathPlace: p.deathPlace ?? null,
    address: p.address ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    occupation: p.occupation ?? null,
    hobbies: p.hobbies ?? null,
    maritalStatus: p.maritalStatus ?? null,
    nationality: p.nationality ?? null,
    languages: p.languages,
    isDeleted: p.isDeleted,
    deletedAt: date(p.deletedAt),
    // Keep the timestamps so a repeated import can judge "newer wins" correctly
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  };
}

const eventData = (personId: string, e: TransferEvent) => ({
  personId,
  date: e.date ?? null,
  datePrecision: e.datePrecision ?? null,
  title: e.title,
  category: e.category,
  description: e.description ?? null,
  place: e.place ?? null,
  sortOrder: e.sortOrder ?? null,
  createdAt: new Date(e.createdAt),
  updatedAt: new Date(e.updatedAt),
});

const noteData = (personId: string, n: TransferNote) => ({
  personId,
  text: n.text,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
});

// The size is that of the stored file, not what the import file claims
const mediaData = (familyTreeId: string, personId: string, m: TransferMedia, file: { name: string; size: number }) => ({
  familyTreeId,
  personId,
  fileName: file.name,
  originalFileName: m.originalFileName,
  mimeType: m.mimeType,
  sizeBytes: file.size,
  type: m.type,
  createdAt: new Date(m.createdAt),
  updatedAt: new Date(m.updatedAt),
});

const relationData = (r: TransferRelation) => ({
  personAId: r.personAId,
  personBId: r.personBId,
  type: r.type,
  label: r.label ?? null,
  active: r.active,
  note: r.note ?? null,
  startDate: date(r.startDate),
  endDate: date(r.endDate),
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});

/** Target of the import: an existing family tree or a new one created in the same transaction */
export type ImportTarget = { treeId: string } | { newTreeName: string };

export interface ApplyResult {
  /** Family tree the data was imported into (for a new one its id) */
  familyTreeId: string;
  createdPersons: number;
  updatedPersons: number;
  removedPersons: number;
  createdRelations: number;
  createdEvents: number;
  createdNotes: number;
  createdMedia: number;
  /** Media whose file was missing in the ZIP file and which were therefore skipped */
  missingFiles: string[];
}

/**
 * Executes the plan completely or not at all: media files are stored beforehand,
 * the database changes run in one transaction. On an error the new files are removed,
 * after success the old files that are no longer needed.
 */
export async function applyPlan(db: PrismaClient, plan: ImportPlan, files: Map<string, Uint8Array>, target: ImportTarget): Promise<ApplyResult> {
  const missingFiles: string[] = [];
  const written: string[] = [];
  const fileFor = new Map<string, { name: string; size: number }>();

  const store = (m: TransferMedia) => {
    const content = files.get(m.path);
    if (!content) {
      missingFiles.push(m.path);
      return false;
    }
    const name = `${randomUUID()}${path.extname(m.path).toLowerCase()}`;
    writeUploadedFile(name, content, uploadDir);
    written.push(name);
    fileFor.set(m.id, { name, size: content.length });
    return true;
  };

  let obsoleteFiles: string[] = [];
  try {
    ensureUploadDir(uploadDir);
    const createMedia = plan.createMedia.filter((c) => store(c.record));
    const updateMedia = plan.updateMedia.filter((c) => store(c.record));

    const result = await db.$transaction(
      async (tx) => {
        const familyTreeId = 'treeId' in target ? target.treeId : (await tx.familyTree.create({ data: { name: target.newTreeName }, select: { id: true } })).id;
        let removedPersons = 0;
        if (plan.replaceAll) {
          // Overwrite only replaces the target family tree – other family trees stay untouched
          const inTree = { person: { familyTreeId } };
          obsoleteFiles = (await tx.media.findMany({ where: { familyTreeId }, select: { fileName: true } })).map((m) => m.fileName);
          await tx.media.deleteMany({ where: { familyTreeId } });
          await tx.note.deleteMany({ where: inTree });
          await tx.event.deleteMany({ where: inTree });
          await tx.relation.deleteMany({ where: { OR: [{ personA: { familyTreeId } }, { personB: { familyTreeId } }] } });
          removedPersons = (await tx.person.deleteMany({ where: { familyTreeId } })).count;
        }

        await tx.person.createMany({
          data: plan.createPersons.map((p) => ({ id: p.id, familyTreeId, ...personData(p), profilePictureId: null })),
        });
        for (const p of plan.updatePersons) {
          await tx.person.update({ where: { id: p.id }, data: personData(p) });
        }

        await tx.event.createMany({ data: plan.createEvents.map((c) => ({ id: c.record.id, ...eventData(c.personId, c.record) })) });
        for (const c of plan.updateEvents) {
          await tx.event.update({ where: { id: c.record.id }, data: eventData(c.personId, c.record) });
        }
        await tx.note.createMany({ data: plan.createNotes.map((c) => ({ id: c.record.id, ...noteData(c.personId, c.record) })) });
        for (const c of plan.updateNotes) {
          await tx.note.update({ where: { id: c.record.id }, data: noteData(c.personId, c.record) });
        }

        await tx.media.createMany({
          data: createMedia.map((c) => ({ id: c.record.id, ...mediaData(familyTreeId, c.personId, c.record, fileFor.get(c.record.id)!) })),
        });
        for (const c of updateMedia) {
          const old = await tx.media.findUnique({ where: { id: c.record.id }, select: { fileName: true } });
          if (old) {
            obsoleteFiles.push(old.fileName);
          }
          await tx.media.update({
            where: { id: c.record.id },
            data: mediaData(familyTreeId, c.personId, c.record, fileFor.get(c.record.id)!),
          });
        }

        await tx.relation.createMany({ data: plan.createRelations.map((r) => ({ id: r.id, ...relationData(r) })) });
        for (const r of plan.updateRelations) {
          await tx.relation.update({ where: { id: r.id }, data: relationData(r) });
        }

        // Links event ↔ medium only now: the media may belong to other persons.
        // Media without a file in the ZIP file are missing and are not linked.
        const linkedEvents = [...plan.createEvents, ...plan.updateEvents].map((c) => c.record);
        const linkedIds = [...new Set(linkedEvents.flatMap((e) => e.mediaIds))];
        const existingMedia = new Set((await tx.media.findMany({ where: { id: { in: linkedIds } }, select: { id: true } })).map((m) => m.id));
        const updatedEventIds = plan.updateEvents.map((c) => c.record.id);
        for (const e of plan.updateEvents) {
          await tx.eventMedia.deleteMany({ where: { eventId: e.record.id, mediaId: { notIn: e.record.mediaIds } } });
        }
        await tx.eventMedia.createMany({
          data: linkedEvents.flatMap((e) => e.mediaIds.filter((id) => existingMedia.has(id)).map((mediaId) => ({ eventId: e.id, mediaId }))),
          // Some links already exist for updated events
          skipDuplicates: updatedEventIds.length > 0,
        });

        // Set profile pictures only once the media exist; if the medium is missing, the person stays without a picture
        const withPicture = [...plan.createPersons, ...plan.updatePersons];
        const pictureIds = withPicture.map((p) => p.profilePictureId).filter((id): id is string => !!id);
        const available = new Set((await tx.media.findMany({ where: { id: { in: pictureIds } }, select: { id: true } })).map((m) => m.id));
        for (const p of withPicture) {
          const profilePictureId = p.profilePictureId && available.has(p.profilePictureId) ? p.profilePictureId : null;
          if (profilePictureId || plan.updatePersons.includes(p)) {
            await tx.person.update({ where: { id: p.id }, data: { profilePictureId, updatedAt: new Date(p.updatedAt) } });
          }
        }

        return {
          familyTreeId,
          createdPersons: plan.createPersons.length,
          updatedPersons: plan.updatePersons.length,
          removedPersons,
          createdRelations: plan.createRelations.length,
          createdEvents: plan.createEvents.length,
          createdNotes: plan.createNotes.length,
          createdMedia: createMedia.length,
          missingFiles,
        };
      },
      { maxWait: 10_000, timeout: 300_000 },
    );

    for (const name of obsoleteFiles) {
      removeUploadedFile(name);
    }
    return result;
  } catch (err) {
    for (const name of written) {
      removeUploadedFile(name);
    }
    throw err;
  }
}
