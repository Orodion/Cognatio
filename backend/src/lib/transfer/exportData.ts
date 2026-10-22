import path from 'path';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { uploadDir, uploadedBytes, uploadedFilePath } from '../files/uploads.js';
import { FORMAT_NAME, formatVersionOf, sortedIds, sortedPersonCitations, type TransferData, type TransferMedia, type TransferPerson } from './format.js';
import { toGedcom, type GedcomVersion } from './gedcom.js';
import { assertFitsLimit, importMaxBytes } from './limits.js';
import { writeZip, type ZipItem } from '../files/zipWriter.js';

type Db = Pick<PrismaClient, 'person' | 'relation' | 'citation' | 'source' | 'repository' | 'media'>;

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

const citationIdsOf = (links: Array<{ citationId: string }>) => sortedIds(links.map((l) => l.citationId));

/** File extension of a stored file, for the readable path in the ZIP file */
const extensionOf = (m: { fileName: string; originalFileName: string }) =>
  path
    .extname(m.fileName || m.originalFileName)
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '');

/**
 * Reads all data of a family tree (including the recycle bin) and assigns readable paths to the media files. From the
 * library (shared by all family trees) it takes the citations its persons, events and relations use, their sources and
 * archives and their scans.
 */
export async function buildExport(db: Db, treeId: string, now = new Date()) {
  const citationLinks = { select: { citationId: true } } as const;
  const persons = await db.person.findMany({
    where: { familyTreeId: treeId },
    include: {
      events: { include: { media: { select: { mediaId: true } }, citations: citationLinks } },
      notes: true,
      media: true,
      citations: { select: { citationId: true, fact: true } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  const relations = await db.relation.findMany({
    where: { personA: { familyTreeId: treeId } },
    include: { citations: citationLinks },
    orderBy: { createdAt: 'asc' },
  });

  const usedCitations = new Set([
    ...persons.flatMap((p) => [...p.citations, ...p.events.flatMap((e) => e.citations)].map((l) => l.citationId)),
    ...relations.flatMap((r) => r.citations.map((l) => l.citationId)),
  ]);
  const citations = usedCitations.size
    ? await db.citation.findMany({ where: { id: { in: [...usedCitations] } }, include: { media: { select: { mediaId: true } } }, orderBy: { id: 'asc' } })
    : [];
  const sourceIds = [...new Set(citations.map((c) => c.sourceId))];
  const sources = sourceIds.length
    ? await db.source.findMany({ where: { id: { in: sourceIds } }, include: { media: { select: { mediaId: true } } }, orderBy: { id: 'asc' } })
    : [];
  const repositoryIds = [...new Set(sources.map((s) => s.repositoryId).filter((id): id is string => !!id))];
  const repositories = repositoryIds.length ? await db.repository.findMany({ where: { id: { in: repositoryIds } }, orderBy: { id: 'asc' } }) : [];
  // Scans: of the library, and files of persons of this family tree; files of other family trees are left out
  const ownMedia = new Set(persons.flatMap((p) => p.media.map((m) => m.id)));
  const scanIds = [...new Set([...sources, ...citations].flatMap((r) => r.media.map((l) => l.mediaId)))];
  const libraryMedia = scanIds.length
    ? await db.media.findMany({ where: { id: { in: scanIds.filter((id) => !ownMedia.has(id)) }, familyTreeId: null }, orderBy: { id: 'asc' } })
    : [];
  const exportable = new Set([...ownMedia, ...libraryMedia.map((m) => m.id)]);
  const scansOf = (links: Array<{ mediaId: string }>) => sortedIds(links.map((l) => l.mediaId).filter((id) => exportable.has(id)));

  // Media files: one folder per person, files named <lastName>_<firstName>_<type>_<n>.<ext>
  const files: Array<{ zipPath: string; diskName: string }> = [];
  const data: TransferData = {
    format: FORMAT_NAME,
    version: 1,
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
          citationIds: citationIdsOf(e.citations),
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
          const zipPath = `${folder}/${base}_${art}_${n}${extensionOf(m)}`;
          files.push({ zipPath, diskName: m.fileName });
          return {
            id: m.id,
            path: zipPath,
            originalFileName: m.originalFileName,
            mimeType: m.mimeType,
            sizeBytes: Number(m.sizeBytes),
            type: m.type,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          };
        }),
        citations: sortedPersonCitations(p.citations.map((l) => ({ citationId: l.citationId, fact: l.fact }))),
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
      citationIds: citationIdsOf(r.citations),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    repositories: repositories.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      url: r.url,
      email: r.email,
      phone: r.phone,
      note: r.note,
      isDeleted: r.isDeleted,
      deletedAt: iso(r.deletedAt),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    sources: sources.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      author: s.author,
      publication: s.publication,
      abbreviation: s.abbreviation,
      text: s.text,
      repositoryId: s.repositoryId,
      callNumber: s.callNumber,
      note: s.note,
      mediaIds: scansOf(s.media),
      isDeleted: s.isDeleted,
      deletedAt: iso(s.deletedAt),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    citations: citations.map((c) => ({
      id: c.id,
      sourceId: c.sourceId,
      page: c.page,
      date: c.date,
      datePrecision: c.datePrecision,
      text: c.text,
      quality: c.quality,
      note: c.note,
      mediaIds: scansOf(c.media),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    // One folder for the scans of the library, named after the original file
    libraryMedia: libraryMedia.map((m): TransferMedia => {
      const zipPath = `media/sources/${safeName(path.parse(m.originalFileName).name).toLowerCase()}_${m.id.slice(0, 8)}${extensionOf(m)}`;
      files.push({ zipPath, diskName: m.fileName });
      return {
        id: m.id,
        path: zipPath,
        originalFileName: m.originalFileName,
        mimeType: m.mimeType,
        sizeBytes: Number(m.sizeBytes),
        type: m.type,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    }),
  };
  data.version = formatVersionOf(data);
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
 * Creates the ZIP file (persons.json + optional media/), written piece by piece while it is sent. Missing media files
 * are skipped, their entries removed and reported in `missing` so the export stays consistent anyway. An export above
 * the optional limit (`maxBytes`) is refused (EXPORT_TOO_LARGE) – it could not be imported again.
 */
export function createZip(data: TransferData, files: Array<{ zipPath: string; diskName: string }>, includeMedia: boolean, maxBytes = importMaxBytes()) {
  const { items, exported, missing } = collectMedia(data, includeMedia ? files : [], maxBytes);
  items.push({ name: 'persons.json', buffer: Buffer.from(JSON.stringify(exported, null, 2)) });
  return { zip: writeZip(items), missing };
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
  const { items, exported, missing } = collectMedia(data, files, maxBytes);
  items.push({ name: 'gedcom.ged', buffer: Buffer.from(toGedcom(exported, version, now, { media: true })) });
  return { zip: writeZip(items, now), missing };
}

/** The media files that exist (missing ones are skipped and their entries removed); refuses an export above the limit */
function collectMedia(data: TransferData, files: Array<{ zipPath: string; diskName: string }>, maxBytes: number) {
  const items: ZipItem[] = [];
  const missing: string[] = [];
  const present = new Set<string>();
  for (const f of files) {
    const file = uploadedFilePath(f.diskName, uploadDir);
    if (!file) {
      missing.push(f.zipPath);
      continue;
    }
    items.push({ name: f.zipPath, file });
    present.add(f.zipPath);
  }
  assertFitsLimit(
    uploadedBytes(
      files.map((f) => f.diskName),
      uploadDir,
    ),
    maxBytes,
    'EXPORT_TOO_LARGE',
  );
  return { items, exported: withMedia(data, (mediaPath) => present.has(mediaPath)), missing };
}

/**
 * Keeps only media whose file is exported; a removed profile picture is reset,
 * links of events, sources and citations to removed media are dropped.
 */
function withMedia(data: TransferData, keep: (mediaPath: string) => boolean): TransferData {
  const kept = new Set([...data.persons.flatMap((p) => p.media), ...data.libraryMedia].filter((m) => keep(m.path)).map((m) => m.id));
  const scans = <T extends { mediaIds: string[] }>(record: T) => ({ ...record, mediaIds: record.mediaIds.filter((id) => kept.has(id)) });
  return {
    ...data,
    libraryMedia: data.libraryMedia.filter((m) => kept.has(m.id)),
    sources: data.sources.map(scans),
    citations: data.citations.map(scans),
    persons: data.persons.map((p) => {
      const media = p.media.filter((m) => kept.has(m.id));
      const profilePictureId = media.some((m) => m.id === p.profilePictureId) ? p.profilePictureId : null;
      const events = p.events.map((e) => ({ ...e, mediaIds: e.mediaIds.filter((id) => kept.has(id)) }));
      return { ...p, events, media, profilePictureId };
    }),
  };
}
