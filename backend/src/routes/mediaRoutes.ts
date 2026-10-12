import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { ensureUploadDir, removeTempFile, uploadDir, uploadedFilePath } from '../lib/files/uploads.js';
import { logger } from '../lib/logger.js';
import { isTreeNotFound, lockTree, requestedTree, resolveTree } from '../lib/treeScope.js';

const router = express.Router();
const log = logger.child({ component: 'media' });

ensureUploadDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

/** Largest file a person can upload (the frontend checks the same limit before sending) */
export const MAX_UPLOAD_MB = 50;
const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 } });

/** The person or family tree of an upload went into the recycle bin or was deleted while the file arrived */
class GoneMeanwhile extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(reason);
  }
}

/** Kinds of media; without a value a file counts as OTHER */
const MEDIA_TYPES = new Set(['PROFILE_PICTURE', 'PHOTO', 'DOCUMENT', 'OTHER']);

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', reason: 'NO_FILE' });
    }

    const { eventId, type } = req.body;
    let { personId } = req.body;
    // Determine type, default to 'OTHER'
    const mediaType = type || 'OTHER';
    if (!MEDIA_TYPES.has(mediaType)) {
      removeTempFile(req.file.path);
      return res.status(400).json({ error: 'Unknown media type', reason: 'INVALID_MEDIA_TYPE' });
    }

    // The file belongs to the active family tree; person and event must be in it
    let treeId: string;
    try {
      treeId = await resolveTree(prisma, requestedTree(req));
    } catch (err) {
      if (!isTreeNotFound(err)) {
        throw err;
      }
      removeTempFile(req.file.path);
      return res.status(404).json({ error: 'Family tree not found', reason: 'TREE_NOT_FOUND' });
    }

    // A person in the recycle bin gets no new files: it is waiting for its permanent deletion (checked again below, in the transaction)
    const inTrash = () => {
      removeTempFile(req.file!.path);
      return res.status(409).json({ error: 'Person is in the recycle bin', reason: 'PERSON_IN_TRASH' });
    };

    if (personId) {
      const person = await prisma.person.findFirst({ where: { id: personId, familyTreeId: treeId }, select: { isDeleted: true } });
      if (!person) {
        removeTempFile(req.file.path);
        return res.status(404).json({ error: 'Person not found', reason: 'PERSON_NOT_FOUND' });
      }
      if (person.isDeleted) {
        return inTrash();
      }
    }

    // With an event: link the file directly; without a person it belongs to the event's person
    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, person: { familyTreeId: treeId } },
        select: { personId: true, person: { select: { isDeleted: true } } },
      });
      if (!event) {
        removeTempFile(req.file.path);
        return res.status(404).json({ error: 'Event not found', reason: 'EVENT_NOT_FOUND' });
      }
      if (event.person?.isDeleted) {
        return inTrash();
      }
      personId ||= event.personId;
    }

    // Medium, link and profile picture together or not at all
    const file = req.file;
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
          ...(eventId ? { events: { create: { eventId } } } : {}),
        },
      });
      // The new link counts as a change of the event (decisive when merging imports)
      if (eventId) {
        await tx.event.update({ where: { id: eventId }, data: { updatedAt: new Date() } });
      }
      // Uploaded directly as profile picture -> assign it to the person
      if (mediaType === 'PROFILE_PICTURE' && personId && created.mimeType.startsWith('image/')) {
        await tx.person.update({ where: { id: personId }, data: { profilePictureId: created.id } });
      }
      return created;
    });

    return res.status(201).json(media);
  } catch (error) {
    // If a file was saved but DB failed, clean up
    if (req.file) {
      removeTempFile(req.file.path);
    }
    if (error instanceof GoneMeanwhile) {
      return res.status(error.status).json({ error: 'Person or family tree was deleted meanwhile', reason: error.reason });
    }
    log.error('Upload failed', { err: error, originalName: req.file?.originalname });
    return res.status(500).json({ error: 'Internal server error during upload', reason: 'UPLOAD_FAILED' });
  }
});

// Download under the original file name (stored is a generated one); only media of the active family tree
router.get('/:id/download', async (req, res) => {
  try {
    let treeId: string;
    try {
      treeId = await resolveTree(prisma, requestedTree(req));
    } catch (err) {
      if (!isTreeNotFound(err)) {
        throw err;
      }
      return res.status(404).json({ error: 'Family tree not found', reason: 'TREE_NOT_FOUND' });
    }
    const media = await prisma.media.findFirst({ where: { id: req.params.id, familyTreeId: treeId }, select: { fileName: true, originalFileName: true } });
    const filePath = media && uploadedFilePath(media.fileName, uploadDir);
    if (!media || !filePath) {
      return res.status(404).json({ error: 'Media not found', reason: 'MEDIA_NOT_FOUND' });
    }
    return res.download(filePath, media.originalFileName, (err) => {
      if (err && !res.headersSent) {
        log.error('Download failed', { err, mediaId: req.params.id });
        res.status(500).json({ error: 'Download failed', reason: 'DOWNLOAD_FAILED' });
      }
    });
  } catch (error) {
    log.error('Download failed', { err: error, mediaId: req.params.id });
    return res.status(500).json({ error: 'Download failed', reason: 'DOWNLOAD_FAILED' });
  }
});

// A file above the limit: an understandable reason instead of the general error (multer has already removed the part it wrote)
router.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large', reason: 'FILE_TOO_LARGE', params: { limitMb: MAX_UPLOAD_MB } });
  }
  next(err);
});

export default router;
