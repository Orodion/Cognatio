import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Request } from 'express';
import multer from 'multer';
import { uploadDir } from './uploads.js';
import { TransferError } from '../transfer/format.js';

/**
 * Import and backup files are uploaded once and kept on disk: the preview and the execution refer to the upload by
 * its id instead of sending the file again. The folder is a dot folder in the upload folder: the same drive as the
 * media (taking files over is a rename) and not served under /uploads.
 */
export const stagingDir = () => path.join(uploadDir, '.staging');

export type UploadPurpose = 'import' | 'backup';

export interface StagedUpload {
  id: string;
  purpose: UploadPurpose;
  path: string;
  originalName: string;
  size: number;
  /** SHA-256 of the content, computed while the file arrived (import history: the same file again) */
  sha256: string;
  createdAt: number;
  /** A running job reads the file: it is not removed by a newer upload or by its age */
  inUse?: boolean;
}

/** An upload is kept for a day; a newer one of the same purpose replaces it */
export const STAGED_UPLOAD_MS = 24 * 60 * 60 * 1000;

const uploads = new Map<string, StagedUpload>();

function remove(upload: StagedUpload) {
  uploads.delete(upload.id);
  try {
    fs.rmSync(upload.path, { force: true });
  } catch {
    // still open somewhere (Windows): removed at the next start of the backend
  }
}

/** Removes the uploads of earlier runs (at the start of the backend) */
export function clearStagedUploads() {
  uploads.clear();
  fs.rmSync(stagingDir(), { recursive: true, force: true });
}

/** Removes old uploads; `purpose`: also all of this purpose (a new file was chosen) */
function prune(now: number, purpose?: UploadPurpose) {
  for (const upload of [...uploads.values()]) {
    if (!upload.inUse && (upload.purpose === purpose || now - upload.createdAt > STAGED_UPLOAD_MS)) {
      remove(upload);
    }
  }
}

/** Storage of multer: writes the file into the staging folder and computes its hash on the way */
const storage = (purpose: UploadPurpose): multer.StorageEngine => ({
  _handleFile(_req: Request, file, done) {
    const target = path.join(stagingDir(), `${purpose}-${randomUUID()}.upload`);
    const hash = createHash('sha256');
    let size = 0;
    const count = new Transform({
      transform(chunk: Buffer, _encoding, next) {
        size += chunk.length;
        hash.update(chunk);
        next(null, chunk);
      },
    });
    fs.mkdirSync(stagingDir(), { recursive: true });
    pipeline(file.stream, count, fs.createWriteStream(target))
      // multer passes on only its own fields: the hash travels as `filename` (the name on disk is in `path`)
      .then(() => done(null, { path: target, size, filename: hash.digest('hex') }))
      .catch((err: Error) => {
        fs.rmSync(target, { force: true });
        done(err);
      });
  },
  _removeFile(_req: Request, file, done) {
    fs.rm(file.path, { force: true }, () => done(null));
  },
});

/** Middleware that receives the file of the field "file" (at most `maxBytes`) */
export const receiveFile = (purpose: UploadPurpose, maxBytes: number) =>
  multer({ storage: storage(purpose), limits: { fileSize: Number.isFinite(maxBytes) ? Math.floor(maxBytes) : Infinity } }).single('file');

/** Registers a received file and returns its upload; older uploads of the same purpose are removed */
export function stageUpload(purpose: UploadPurpose, file: Express.Multer.File | undefined, now = Date.now()): StagedUpload {
  if (!file) {
    throw new TransferError('NO_FILE');
  }
  prune(now, purpose);
  const upload: StagedUpload = {
    id: randomUUID(),
    purpose,
    path: file.path,
    originalName: file.originalname,
    size: file.size,
    sha256: file.filename,
    createdAt: now,
  };
  uploads.set(upload.id, upload);
  return upload;
}

/** The upload with this id; UPLOAD_NOT_FOUND if it expired or was replaced (the user chooses the file again) */
export function stagedUpload(purpose: UploadPurpose, id: unknown, now = Date.now()): StagedUpload {
  prune(now);
  const upload = typeof id === 'string' ? uploads.get(id) : undefined;
  if (!upload || upload.purpose !== purpose || !fs.existsSync(upload.path)) {
    throw new TransferError('UPLOAD_NOT_FOUND');
  }
  return upload;
}

/** Marks an upload as read by a job (true) or free again (false) */
export function holdUpload(upload: StagedUpload, inUse: boolean) {
  upload.inUse = inUse;
}

/** Removes an upload after it was used */
export function discardUpload(upload: StagedUpload) {
  remove(upload);
}

/**
 * Stages a file on this computer (an AI assistant names it by its path) like an upload: copied into the staging folder
 * with its hash, so preview and execution work on a copy that cannot change meanwhile. At most `maxBytes`.
 */
export async function stageLocalFile(purpose: UploadPurpose, filePath: string, maxBytes: number, now = Date.now()): Promise<StagedUpload> {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new TransferError('NO_FILE');
  }
  if (stat.size > maxBytes) {
    throw new TransferError('TOO_LARGE', [], { limitMb: Math.ceil(maxBytes / (1024 * 1024)) });
  }
  const target = path.join(stagingDir(), `${purpose}-${randomUUID()}.upload`);
  const hash = createHash('sha256');
  const count = new Transform({
    transform(chunk: Buffer, _encoding, next) {
      hash.update(chunk);
      next(null, chunk);
    },
  });
  fs.mkdirSync(stagingDir(), { recursive: true });
  try {
    await pipeline(fs.createReadStream(filePath), count, fs.createWriteStream(target));
  } catch (err) {
    fs.rmSync(target, { force: true });
    throw err;
  }
  return stageUpload(
    purpose,
    { path: target, originalname: path.basename(filePath), size: stat.size, filename: hash.digest('hex') } as Express.Multer.File,
    now,
  );
}
