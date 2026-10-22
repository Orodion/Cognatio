import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { ensureUploadDir, uploadDir, uploadedFilePath } from '../lib/files/uploads.js';
import { storeMedia } from '../lib/files/storeMedia.js';
import { logger } from '../lib/logger.js';
import { enoughSpaceFor } from '../lib/files/freeSpace.js';
import { isTreeNotFound, requestedTree, resolveTree } from '../lib/treeScope.js';
import { linkableMedia } from '../lib/libraryMedia.js';

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

// No limit per file (videos of an hour or more): only the free space counts
const upload = multer({ storage });

/** Refuses an upload that does not fit on the drive, before it is written */
const enoughSpace = enoughSpaceFor(() => uploadDir);

router.post('/upload', enoughSpace, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded', reason: 'NO_FILE' });
  }
  const answer = await storeMedia(req.file, req.body ?? {}, () => resolveTree(prisma, requestedTree(req)));
  return res.status(answer.status).json(answer.body);
});

// Download under the original file name (stored is a generated one); only media of the active family tree and scans of
// the library
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
    const media = await prisma.media.findFirst({
      where: { id: req.params.id, ...linkableMedia(treeId) },
      select: { fileName: true, originalFileName: true },
    });
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

export default router;
