import fs from 'fs';
import path from 'path';
import { dataDirPath } from './dataDir.js';

/** Storage location of uploaded files (served statically under /uploads): UPLOAD_DIR (e.g. E2E tests), otherwise uploads/ in COGNATIO_DATA_DIR or in the backend folder. */
export const uploadDir = process.env.UPLOAD_DIR ?? dataDirPath(process.env, 'uploads') ?? path.join(process.cwd(), 'uploads');

/** Public URL of an uploaded file (relative so it works through the frontend proxy). */
export const uploadUrl = (fileName: string) => `/uploads/${encodeURIComponent(fileName)}`;

/** Creates the upload folder if it does not exist yet. */
export function ensureUploadDir(dir = uploadDir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Stores an uploaded file under the given name (the upload folder must exist, see `ensureUploadDir`). */
export function writeUploadedFile(fileName: string, content: Uint8Array, dir = uploadDir) {
  fs.writeFileSync(path.join(dir, path.basename(fileName)), content);
}

/** Content of an uploaded file, or null if it does not exist. */
export function readUploadedFile(fileName: string, dir = uploadDir): Buffer | null {
  const filePath = path.join(dir, path.basename(fileName));
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

/** Path of an uploaded file for sending it, or null if it does not exist. */
export function uploadedFilePath(fileName: string, dir = uploadDir): string | null {
  const filePath = path.join(dir, path.basename(fileName));
  return fs.existsSync(filePath) ? filePath : null;
}

/** Total size of uploaded files; a file that is missing counts as 0 (it is skipped when packing anyway). */
export function uploadedBytes(fileNames: string[], dir = uploadDir): number {
  let total = 0;
  for (const name of fileNames) {
    try {
      total += fs.statSync(path.join(dir, path.basename(name))).size;
    } catch {
      // missing file
    }
  }
  return total;
}

/** Deletes a file that was just received (path as given by the upload middleware); a missing file is ignored. */
export function removeTempFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/** Deletes an uploaded file; missing files are ignored. */
export function removeUploadedFile(fileName: string) {
  // basename prevents a manipulated file name from leading out of the upload folder
  const filePath = path.join(uploadDir, path.basename(fileName));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
