import path from 'path';
import { zipSync, strToU8, type Zippable } from 'fflate';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { readUploadedFile, uploadDir, uploadedBytes } from '../files/uploads.js';
import { FORMAT_NAME, FORMAT_VERSION, sortedIds, type TransferData, type TransferPerson } from './format.js';
import { toGedcom, type GedcomVersion } from './gedcom.js';
import { assertFitsLimit, importMaxBytes } from './limits.js';

type Db = Pick<PrismaClient, 'person' | 'relation'>;

const TRANSLITERATION: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue' };

/** File name without special characters: transliterate umlauts, remove accents, replace the rest with "_". */
export function safeName(value: string | null | undefined, fallback = 'unknown'): string {
  const cleaned = (value ?? '')
    .replace(/[äöüßÄÖÜ]/g, (c) => TRANSLITERATION[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Reads all data of a family tree (including the recycle bin) and assigns readable paths to the media files. */
export async function buildExport(db: Db, treeId: string, now = new Date()) {
  const persons = await db.person.findMany({
    where: { familyTreeId: treeId },
    include: { events: { include: { media: { select: { mediaId: true } } } }, notes: true, media: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  const relations = await db.relation.findMany({ where: { personA: { familyTreeId: treeId } }, orderBy: { createdAt: 'asc' } });

  // Media files: one folder per person, files named <lastName>_<firstName>_<type>_<n>.<ext>
  const files: Array<{ zipPath: string; diskName: string }> = [];
  const data: TransferData = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    source: 'Cognatio',
    persons: persons.map((p): TransferPerson => {
      const base = `${safeName(p.lastName).toLowerCase()}_${safeName(p.firstName).toLowerCase()}`;
      const folder = `media/${safeName(p.lastName)}_${safeName(p.firstName)}_${p.id.slice(0, 8)}`;
      const counter = new Map<string, number>();
      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName,
        birthName: p.birthName,
        title: p.title,
        nickname: p.nickname,
        birthDate: p.birthDate,
        birthDatePrecision: p.birthDatePrecision,
        birthPlace: p.birthPlace,
        gender: p.gender,
        deathDate: p.deathDate,
        deathDatePrecision: p.deathDatePrecision,
        deathPlace: p.deathPlace,
        address: p.address,
        phone: p.phone,
        email: p.email,
        occupation: p.occupation,
        hobbies: p.hobbies,
        maritalStatus: p.maritalStatus,
        nationality: p.nationality,
        languages: p.languages,
        profilePictureId: p.profilePictureId,
        isDeleted: p.isDeleted,
        deletedAt: iso(p.deletedAt),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        events: p.events.map((e) => ({
          id: e.id,
          date: e.date,
          datePrecision: e.datePrecision,
          title: e.title,
          category: e.category,
          description: e.description,
          place: e.place,
          sortOrder: e.sortOrder,
          mediaIds: sortedIds(e.media.map((link) => link.mediaId)),
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
        notes: p.notes.map((n) => ({
          id: n.id,
          text: n.text,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        })),
        media: p.media.map((m) => {
          const art = safeName(m.type).toLowerCase();
          const n = (counter.get(art) ?? 0) + 1;
          counter.set(art, n);
          const ext = path
            .extname(m.fileName || m.originalFileName)
            .toLowerCase()
            .replace(/[^.a-z0-9]/g, '');
          const zipPath = `${folder}/${base}_${art}_${n}${ext}`;
          files.push({ zipPath, diskName: m.fileName });
          return {
            id: m.id,
            path: zipPath,
            originalFileName: m.originalFileName,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
            type: m.type,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          };
        }),
      };
    }),
    relations: relations.map((r) => ({
      id: r.id,
      personAId: r.personAId,
      personBId: r.personBId,
      type: r.type,
      label: r.label,
      active: r.active,
      note: r.note,
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
  return { data, files };
}

/** Most common last name of the (not deleted) persons – for the file name. */
export function familyName(data: TransferData): string | null {
  const counts = new Map<string, number>();
  for (const p of data.persons) {
    if (p.isDeleted || !p.lastName) {
      continue;
    }
    counts.set(p.lastName, (counts.get(p.lastName) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [name, count] of counts) {
    if (!best || count > counts.get(best)!) {
      best = name;
    }
  }
  return best;
}

/** Timestamp YYYYmmdd_HHMMSS (local time of the server) */
export function fileTimestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Readable file name, e.g. "family_tree_Mustermann_20260928_143005" (without extension) */
export function exportFileName(data: TransferData, d: Date): string {
  const family = familyName(data);
  return ['family_tree', family ? safeName(family) : null, fileTimestamp(d)].filter(Boolean).join('_');
}

/**
 * Creates the ZIP file (persons.json + optional media/). Missing media files are skipped,
 * their entries removed and reported in `missing` so the export stays consistent anyway.
 * Media above `maxBytes` are refused (EXPORT_TOO_LARGE) – such a file could not be imported again.
 */
export function createZip(data: TransferData, files: Array<{ zipPath: string; diskName: string }>, includeMedia: boolean, maxBytes = importMaxBytes()) {
  const media = includeMedia ? files : [];
  assertFitsLimit(
    uploadedBytes(
      media.map((f) => f.diskName),
      uploadDir,
    ),
    maxBytes,
    'EXPORT_TOO_LARGE',
  );
  const { zip, exported, missing } = collectMedia(data, media);
  zip['persons.json'] = strToU8(JSON.stringify(exported, null, 2));
  return { buffer: Buffer.from(zipSync(zip)), missing };
}

/**
 * GEDZIP (GEDCOM 7, a plain ZIP file for 5.5.1): "gedcom.ged" with the media under the same
 * paths as in the ZIP export – for programs that can take over images and documents as well.
 */
export function createGedzip(
  data: TransferData,
  files: Array<{ zipPath: string; diskName: string }>,
  version: GedcomVersion,
  now: Date,
  maxBytes = importMaxBytes(),
) {
  assertFitsLimit(
    uploadedBytes(
      files.map((f) => f.diskName),
      uploadDir,
    ),
    maxBytes,
    'EXPORT_TOO_LARGE',
  );
  const { zip, exported, missing } = collectMedia(data, files);
  zip['gedcom.ged'] = strToU8(toGedcom(exported, version, now, { media: true }));
  return { buffer: Buffer.from(zipSync(zip)), missing };
}

/** Read the media files; missing ones are skipped and their entries removed */
function collectMedia(data: TransferData, files: Array<{ zipPath: string; diskName: string }>) {
  const zip: Zippable = {};
  const missing: string[] = [];
  const present = new Set<string>();
  for (const f of files) {
    const content = readUploadedFile(f.diskName, uploadDir);
    if (!content) {
      missing.push(f.zipPath);
      continue;
    }
    // Images/documents are usually compressed already – store only
    zip[f.zipPath] = [content, { level: 0 }];
    present.add(f.zipPath);
  }
  return { zip, exported: withMedia(data, (mediaPath) => present.has(mediaPath)), missing };
}

/**
 * Keeps only media whose file is exported; a removed profile picture is reset,
 * links of events to removed media are dropped.
 */
function withMedia(data: TransferData, keep: (mediaPath: string) => boolean): TransferData {
  const kept = new Set(data.persons.flatMap((p) => p.media.filter((m) => keep(m.path)).map((m) => m.id)));
  return {
    ...data,
    persons: data.persons.map((p) => {
      const media = p.media.filter((m) => kept.has(m.id));
      const profilePictureId = media.some((m) => m.id === p.profilePictureId) ? p.profilePictureId : null;
      const events = p.events.map((e) => ({ ...e, mediaIds: e.mediaIds.filter((id) => kept.has(id)) }));
      return { ...p, events, media, profilePictureId };
    }),
  };
}
