import fs from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from 'express';
import { TransferError } from '../transfer/format.js';
import { toMb } from '../transfer/limits.js';

const MB = 1024 * 1024;

/** Space kept free on the drive, so the database and the logs can still write */
export const RESERVE_BYTES = 256 * MB;

/** The folder itself or the nearest one above it that exists (a folder that is created only later) */
function existing(dir: string): string {
  let current = path.resolve(dir);
  while (!fs.existsSync(current) && path.dirname(current) !== current) {
    current = path.dirname(current);
  }
  return current;
}

/** Free bytes on the drive of `dir` (Infinity if the system does not tell) */
export async function freeBytes(dir: string): Promise<number> {
  try {
    const stats = await fs.promises.statfs(existing(dir));
    return stats.bavail * stats.bsize;
  } catch {
    return Infinity;
  }
}

/** True if both folders are on the same drive: then one operation that writes into both needs the space once in sum */
export function sameDrive(a: string, b: string): boolean {
  try {
    return fs.statSync(existing(a)).dev === fs.statSync(existing(b)).dev;
  } catch {
    return false;
  }
}

/** Refuses an operation that would need more space than the drive of `dir` has – before anything is written */
export async function assertFreeSpace(dir: string, needed: number) {
  const free = await freeBytes(dir);
  if (needed + RESERVE_BYTES > free) {
    throw new TransferError('NOT_ENOUGH_SPACE', [`${needed} bytes needed, ${free} bytes free in ${dir}`], {
      neededMb: toMb(needed + RESERVE_BYTES),
      freeMb: Math.floor(free / MB),
    });
  }
}

/**
 * Middleware before an upload into `dir`: refuses a file that does not fit on the drive before it is written (the
 * size is in Content-Length) with 413 NOT_ENOUGH_SPACE.
 */
export const enoughSpaceFor =
  (dir: () => string): RequestHandler =>
  (req, res, next) => {
    const length = Number(req.headers['content-length']);
    if (!(length > 0)) {
      next();
      return;
    }
    assertFreeSpace(dir(), length).then(
      () => next(),
      (err: TransferError) => {
        // Read the file without keeping it, then answer: an answer in the middle of the upload breaks the connection
        req.once('end', () => res.status(413).json({ error: 'Not enough space', reason: err.reason, params: err.params }));
        req.resume();
      },
    );
  };
