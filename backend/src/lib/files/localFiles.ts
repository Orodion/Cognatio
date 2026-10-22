import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { dataDirPath } from './dataDir.js';
import { assertFreeSpace } from './freeSpace.js';
import { ensureUploadDir, uploadDir } from './uploads.js';
import type { ReceivedFile } from './storeMedia.js';
import { backupDir } from '../systemInfo.js';

/** A path an assistant named that cannot be used: reason (PATH_NOT_ALLOWED, FILE_NOT_FOUND …) and message */
export class LocalFileError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Files never travel through MCP itself: an assistant names a path on this computer (a scan to add, a file to import,
 * a folder for an export). Only paths in the user's home folder, the data folder and the backup folder are accepted.
 */
export function allowedRoots(): string[] {
  const roots = [os.homedir(), backupDir(), dataDirPath(process.env)].filter((root): root is string => !!root);
  return [...new Set(roots.map((root) => path.resolve(root)))];
}

const inside = (child: string, root: string) => {
  const relative = path.relative(root, child);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
};

/** The real path (links resolved) if it lies in an allowed folder; otherwise PATH_NOT_ALLOWED */
function allowedPath(given: string, roots: string[]): string {
  if (!path.isAbsolute(given)) {
    throw new LocalFileError('PATH_NOT_ALLOWED', `Give an absolute path: ${given}`);
  }
  let real: string;
  try {
    real = fs.realpathSync(path.resolve(given));
  } catch {
    throw new LocalFileError('FILE_NOT_FOUND', `Not found: ${given}`);
  }
  const realRoots = roots.map((root) => {
    try {
      return fs.realpathSync(root);
    } catch {
      return root;
    }
  });
  if (!realRoots.some((root) => inside(real, root))) {
    throw new LocalFileError('PATH_NOT_ALLOWED', `Only files in these folders are allowed: ${roots.join(', ')}`);
  }
  return real;
}

/** A file to read (import, restore, a scan to add) */
export function readableFile(given: string, roots = allowedRoots()): string {
  const real = allowedPath(given, roots);
  if (!fs.statSync(real).isFile()) {
    throw new LocalFileError('FILE_NOT_FOUND', `Not a file: ${given}`);
  }
  return real;
}

/** A folder to write into (export); it must exist */
export function writableFolder(given: string, roots = allowedRoots()): string {
  const real = allowedPath(given, roots);
  if (!fs.statSync(real).isDirectory()) {
    throw new LocalFileError('FOLDER_NOT_FOUND', `Not a folder: ${given}`);
  }
  return real;
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.heic': 'image/heic',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
};

/** Media type by the extension (the browser names it for an upload of the page) */
export const mimeTypeOf = (fileName: string) => MIME_TYPES[path.extname(fileName).toLowerCase()] ?? 'application/octet-stream';

/** Copies a file of this computer into the upload folder under a new name, as an upload of the page would */
export async function copyIntoUploads(source: string): Promise<ReceivedFile> {
  const size = fs.statSync(source).size;
  ensureUploadDir(uploadDir);
  await assertFreeSpace(uploadDir, size);
  const filename = `${randomUUID()}${path.extname(source).toLowerCase()}`;
  const target = path.join(uploadDir, filename);
  await fs.promises.copyFile(source, target);
  return { path: target, filename, originalname: path.basename(source), mimetype: mimeTypeOf(source), size };
}

/** The ZIP files of a folder (backups), newest first; empty if the folder does not exist */
export function zipFilesIn(dir: string) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.zip'))
    .map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return { file: path.join(dir, name), bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export const ensureFolder = (dir: string) => fs.mkdirSync(dir, { recursive: true });
