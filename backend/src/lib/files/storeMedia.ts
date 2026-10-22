import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { removeTempFile } from './uploads.js';
import { contentFits } from './fileContent.js';
import { mimeTypeOf } from './localFiles.js';
import { isTreeNotFound, lockTree } from '../treeScope.js';

const log = logger.child({ component: 'media' });

/** Kinds of media; without a value a file counts as OTHER */
export const MEDIA_TYPES = ['PROFILE_PICTURE', 'PHOTO', 'DOCUMENT', 'OTHER'] as const;

/** A file that has just been written into the upload folder (by the upload of the page or by an assistant) */
export interface ReceivedFile {
  /** Path in the upload folder */
  path: string;
  /** Generated name in the upload folder */
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Where the file belongs: a person and/or an event of the family tree, or a source or citation of the library */
export interface MediaTarget {
  personId?: unknown;
  eventId?: unknown;
  sourceId?: unknown;
  citationId?: unknown;
  type?: unknown;
}

/** The answer as the route sends it */
export interface MediaAnswer {
  status: number;
  body: Record<string, unknown>;
}

/** The person or family tree of an upload went into the recycle bin or was deleted while the file arrived */
class GoneMeanwhile extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(reason);
  }
}

const refused = (file: ReceivedFile, status: number, error: string, reason: string): MediaAnswer => {
  removeTempFile(file.path);
  return { status, body: { error, reason } };
};

/**
 * Records a received file as a medium and links it; on any refusal the file is removed again. `tree` gives the
 * active family tree (TREE_NOT_FOUND if there is none).
 */
export async function storeMedia(file: ReceivedFile, target: MediaTarget, tree: () => Promise<string>): Promise<MediaAnswer> {
  try {
    const { eventId, sourceId, citationId } = target;
    let personId = typeof target.personId === 'string' ? target.personId : undefined;
    // Determine type, default to 'OTHER'
    const mediaType = (target.type || 'OTHER') as string;
    if (!(MEDIA_TYPES as readonly unknown[]).includes(mediaType)) {
      return refused(file, 400, 'Unknown media type', 'INVALID_MEDIA_TYPE');
    }
    // A picture or PDF by its name or the browser has to be one (e.g. no text file named "photo.jpg")
    if (!contentFits(file.path, [file.mimetype, mimeTypeOf(file.originalname)])) {
      return refused(file, 400, 'The content of the file does not fit its type', 'FILE_CONTENT_MISMATCH');
    }

    // A scan of a source or citation belongs to the library (no family tree, no person)
    if (sourceId || citationId) {
      return await storeInLibrary(file, mediaType, sourceId, citationId);
    }

    // The file belongs to the active family tree; person and event must be in it
    let treeId: string;
    try {
      treeId = await tree();
    } catch (err) {
      if (!isTreeNotFound(err)) {
        throw err;
      }
      return refused(file, 404, 'Family tree not found', 'TREE_NOT_FOUND');
    }

    // A person in the recycle bin gets no new files: it is waiting for its permanent deletion (checked again below, in the transaction)
    const inTrash = () => refused(file, 409, 'Person is in the recycle bin', 'PERSON_IN_TRASH');

    if (personId) {
      const person = await prisma.person.findFirst({ where: { id: personId, familyTreeId: treeId }, select: { isDeleted: true } });
      if (!person) {
        return refused(file, 404, 'Person not found', 'PERSON_NOT_FOUND');
      }
      if (person.isDeleted) {
        return inTrash();
      }
    }

    // With an event: link the file directly; without a person it belongs to the event's person
    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: String(eventId), person: { familyTreeId: treeId } },
        select: { personId: true, person: { select: { isDeleted: true } } },
      });
      if (!event) {
        return refused(file, 404, 'Event not found', 'EVENT_NOT_FOUND');
      }
      if (event.person?.isDeleted) {
        return inTrash();
      }
      personId ||= event.personId;
    }

    // Medium, link and profile picture together or not at all
    const media = await prisma.$transaction(async (tx) => {
      // A permanent deletion running at the same time locks the family tree as well: wait for it and check again
      if (!(await lockTree(tx, treeId))) {
        throw new GoneMeanwhile(404, 'TREE_NOT_FOUND');
      }
      if (personId && !(await tx.person.findFirst({ where: { id: personId, familyTreeId: treeId, isDeleted: false }, select: { id: true } }))) {
        throw new GoneMeanwhile(409, 'PERSON_IN_TRASH');
      }
      const created = await tx.media.create({
        data: {
          fileName: file.filename,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          type: mediaType,
          personId: personId || null,
          familyTreeId: treeId,
          ...(eventId ? { events: { create: { eventId: String(eventId) } } } : {}),
        },
      });
      // The new link counts as a change of the event (decisive when merging imports)
      if (eventId) {
        await tx.event.update({ where: { id: String(eventId) }, data: { updatedAt: new Date() } });
      }
      // Uploaded directly as profile picture -> assign it to the person
      if (mediaType === 'PROFILE_PICTURE' && personId && created.mimeType.startsWith('image/')) {
        await tx.person.update({ where: { id: personId }, data: { profilePictureId: created.id } });
      }
      return created;
    });

    // The size is 64 bits in the database; JSON knows no bigint
    return { status: 201, body: { ...media, sizeBytes: Number(media.sizeBytes) } };
  } catch (error) {
    // If a file was saved but DB failed, clean up
    removeTempFile(file.path);
    if (error instanceof GoneMeanwhile) {
      return { status: error.status, body: { error: 'Person or family tree was deleted meanwhile', reason: error.reason } };
    }
    log.error('Upload failed', { err: error, originalName: file.originalname });
    return { status: 500, body: { error: 'Internal server error during upload', reason: 'UPLOAD_FAILED' } };
  }
}

/** Stores a scan of a source or a citation (the source must not be in the recycle bin) and links it */
async function storeInLibrary(file: ReceivedFile, type: string, sourceId: unknown, citationId: unknown): Promise<MediaAnswer> {
  if ((sourceId && citationId) || (sourceId && typeof sourceId !== 'string') || (citationId && typeof citationId !== 'string')) {
    return refused(file, 400, 'A scan belongs to one source or one citation', 'INVALID_MEDIA_TARGET');
  }
  const target = sourceId
    ? await prisma.source.findFirst({ where: { id: sourceId as string, isDeleted: false }, select: { id: true } })
    : await prisma.citation.findFirst({ where: { id: citationId as string, source: { isDeleted: false } }, select: { id: true } });
  if (!target) {
    return sourceId ? refused(file, 404, 'Source not found', 'SOURCE_NOT_FOUND') : refused(file, 404, 'Citation not found', 'CITATION_NOT_FOUND');
  }
  const media = await prisma.$transaction(async (tx) => {
    const created = await tx.media.create({
      data: {
        fileName: file.filename,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        type,
        personId: null,
        familyTreeId: null,
      },
    });
    // The new scan counts as a change of the source or citation (decisive when merging imports)
    if (sourceId) {
      await tx.sourceMedia.create({ data: { sourceId: sourceId as string, mediaId: created.id } });
      await tx.source.update({ where: { id: sourceId as string }, data: { updatedAt: new Date() } });
    } else {
      await tx.citationMedia.create({ data: { citationId: citationId as string, mediaId: created.id } });
      await tx.citation.update({ where: { id: citationId as string }, data: { updatedAt: new Date() } });
    }
    return created;
  });
  return { status: 201, body: { ...media, sizeBytes: Number(media.sizeBytes) } };
}
