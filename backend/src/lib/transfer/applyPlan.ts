import path from 'path';
import { randomUUID } from 'crypto';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ensureUploadDir, removeUploadedFile, uploadDir } from '../files/uploads.js';
import type { ArchiveFiles } from '../files/archive.js';
import { assertFreeSpace } from '../files/freeSpace.js';
import type {
  TransferCitation,
  TransferEvent,
  TransferMedia,
  TransferNote,
  TransferPerson,
  TransferRelation,
  TransferRepository,
  TransferSource,
} from './format.js';
import type { JobControl } from './jobs.js';
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

// The size is that of the stored file, not what the import file claims; scans of the library have no family tree
const mediaData = (familyTreeId: string | null, personId: string | null, m: TransferMedia, file: { name: string; size: number }) => ({
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

const repositoryData = (r: TransferRepository) => ({
  name: r.name,
  address: r.address ?? null,
  url: r.url ?? null,
  email: r.email ?? null,
  phone: r.phone ?? null,
  note: r.note ?? null,
  isDeleted: r.isDeleted,
  deletedAt: date(r.deletedAt),
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
});

const sourceData = (s: TransferSource) => ({
  type: s.type,
  title: s.title,
  author: s.author ?? null,
  publication: s.publication ?? null,
  abbreviation: s.abbreviation ?? null,
  text: s.text ?? null,
  repositoryId: s.repositoryId ?? null,
  callNumber: s.callNumber ?? null,
  note: s.note ?? null,
  isDeleted: s.isDeleted,
  deletedAt: date(s.deletedAt),
  createdAt: new Date(s.createdAt),
  updatedAt: new Date(s.updatedAt),
});

const citationData = (c: TransferCitation) => ({
  sourceId: c.sourceId,
  page: c.page ?? null,
  date: c.date ?? null,
  datePrecision: c.datePrecision ?? null,
  text: c.text ?? null,
  quality: c.quality ?? null,
  note: c.note ?? null,
  createdAt: new Date(c.createdAt),
  updatedAt: new Date(c.updatedAt),
});

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Archives, sources, citations and their scans: added to the library or updated, never deleted (other family trees may
 * use them). Their links to scans follow the file; scans whose file is missing are not linked.
 */
async function applyLibrary(
  tx: Tx,
  plan: ImportPlan,
  media: { create: Array<{ record: TransferMedia }>; update: Array<{ record: TransferMedia }> },
  fileFor: Map<string, { name: string; size: number }>,
  obsoleteFiles: string[],
) {
  await tx.repository.createMany({ data: plan.createRepositories.map((r) => ({ id: r.id, ...repositoryData(r) })) });
  for (const r of plan.updateRepositories) {
    await tx.repository.update({ where: { id: r.id }, data: repositoryData(r) });
  }
  await tx.source.createMany({ data: plan.createSources.map((s) => ({ id: s.id, ...sourceData(s) })) });
  for (const s of plan.updateSources) {
    await tx.source.update({ where: { id: s.id }, data: sourceData(s) });
  }
  await tx.media.createMany({ data: media.create.map((c) => ({ id: c.record.id, ...mediaData(null, null, c.record, fileFor.get(c.record.id)!) })) });
  for (const c of media.update) {
    const old = await tx.media.findUnique({ where: { id: c.record.id }, select: { fileName: true } });
    if (old) {
      obsoleteFiles.push(old.fileName);
    }
    await tx.media.update({ where: { id: c.record.id }, data: mediaData(null, null, c.record, fileFor.get(c.record.id)!) });
  }
  await tx.citation.createMany({ data: plan.createCitations.map((c) => ({ id: c.id, ...citationData(c) })) });
  for (const c of plan.updateCitations) {
    await tx.citation.update({ where: { id: c.id }, data: citationData(c) });
  }

  const sources = [...plan.createSources, ...plan.updateSources];
  const citations = [...plan.createCitations, ...plan.updateCitations];
  const linkedIds = [...new Set([...sources, ...citations].flatMap((r) => r.mediaIds))];
  const existingMedia = new Set((await tx.media.findMany({ where: { id: { in: linkedIds } }, select: { id: true } })).map((m) => m.id));
  for (const s of plan.updateSources) {
    await tx.sourceMedia.deleteMany({ where: { sourceId: s.id, mediaId: { notIn: s.mediaIds } } });
  }
  await tx.sourceMedia.createMany({
    data: sources.flatMap((s) => s.mediaIds.filter((id) => existingMedia.has(id)).map((mediaId) => ({ sourceId: s.id, mediaId }))),
    skipDuplicates: true,
  });
  for (const c of plan.updateCitations) {
    await tx.citationMedia.deleteMany({ where: { citationId: c.id, mediaId: { notIn: c.mediaIds } } });
  }
  await tx.citationMedia.createMany({
    data: citations.flatMap((c) => c.mediaIds.filter((id) => existingMedia.has(id)).map((mediaId) => ({ citationId: c.id, mediaId }))),
    skipDuplicates: true,
  });
}

/** Links of persons, events and relations to citations as in the file (created and updated records) */
async function applyCitationLinks(tx: Tx, plan: ImportPlan) {
  for (const p of plan.updatePersons) {
    await tx.personCitation.deleteMany({
      where: { personId: p.id, NOT: p.citations.length ? p.citations.map((c) => ({ citationId: c.citationId, fact: c.fact })) : undefined },
    });
  }
  await tx.personCitation.createMany({
    data: [...plan.createPersons, ...plan.updatePersons].flatMap((p) => p.citations.map((c) => ({ personId: p.id, citationId: c.citationId, fact: c.fact }))),
    skipDuplicates: true,
  });
  for (const c of plan.updateEvents) {
    await tx.eventCitation.deleteMany({ where: { eventId: c.record.id, citationId: { notIn: c.record.citationIds } } });
  }
  await tx.eventCitation.createMany({
    data: [...plan.createEvents, ...plan.updateEvents].flatMap((c) => c.record.citationIds.map((citationId) => ({ eventId: c.record.id, citationId }))),
    skipDuplicates: true,
  });
  for (const r of plan.updateRelations) {
    await tx.relationCitation.deleteMany({ where: { relationId: r.id, citationId: { notIn: r.citationIds } } });
  }
  await tx.relationCitation.createMany({
    data: [...plan.createRelations, ...plan.updateRelations].flatMap((r) => r.citationIds.map((citationId) => ({ relationId: r.id, citationId }))),
    skipDuplicates: true,
  });
}

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
  createdSources: number;
  createdCitations: number;
  /** Media whose file was missing in the ZIP file and which were therefore skipped */
  missingFiles: string[];
}

/** Copies the media of the plan from the import file into the upload folder; the ones without a file are left out */
async function storeMedia<T extends { record: TransferMedia }>(
  changes: T[],
  files: ArchiveFiles,
  stored: { written: string[]; missing: string[]; fileFor: Map<string, { name: string; size: number }> },
  job?: JobControl,
): Promise<T[]> {
  const kept: T[] = [];
  for (const change of changes) {
    const m = change.record;
    if (!files.has(m.path)) {
      stored.missing.push(m.path);
      continue;
    }
    job?.checkpoint();
    const name = `${randomUUID()}${path.extname(m.path).toLowerCase()}`;
    await files.copyTo(m.path, path.join(uploadDir, name), job?.advance);
    stored.written.push(name);
    stored.fileFor.set(m.id, { name, size: files.size(m.path) });
    kept.push(change);
  }
  return kept;
}

/**
 * Executes the plan completely or not at all: media files are copied from the import file beforehand (piece by
 * piece, after checking the free space), the database changes run in one transaction. On an error or when the user
 * cancels before the database step, the new files are removed; after success the old files that are no longer needed.
 */
export async function applyPlan(db: PrismaClient, plan: ImportPlan, files: ArchiveFiles, target: ImportTarget, job?: JobControl): Promise<ApplyResult> {
  const stored = { written: [] as string[], missing: [] as string[], fileFor: new Map<string, { name: string; size: number }>() };
  const { written, fileFor } = stored;
  const missingFiles = stored.missing;

  let obsoleteFiles: string[] = [];
  try {
    ensureUploadDir(uploadDir);
    const media = [...plan.createMedia, ...plan.updateMedia, ...plan.createLibraryMedia, ...plan.updateLibraryMedia].map((c) => c.record.path);
    const bytes = files.totalSize(media);
    await assertFreeSpace(uploadDir, bytes);
    job?.phase('media', bytes);
    const createMedia = await storeMedia(plan.createMedia, files, stored, job);
    const updateMedia = await storeMedia(plan.updateMedia, files, stored, job);
    const libraryMedia = {
      create: await storeMedia(plan.createLibraryMedia, files, stored, job),
      update: await storeMedia(plan.updateLibraryMedia, files, stored, job),
    };
    job?.checkpoint(true);
    job?.phase('database');

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

        // The library first: links of persons, events and relations refer to its citations
        await applyLibrary(tx, plan, libraryMedia, fileFor, obsoleteFiles);

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

        await applyCitationLinks(tx, plan);

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
          createdSources: plan.createSources.length,
          createdCitations: plan.createCitations.length,
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
