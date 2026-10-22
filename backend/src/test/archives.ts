import fs from 'fs';
import os from 'os';
import path from 'path';
import { strToU8, zipSync } from 'fflate';
import type { ZipOutput } from '../lib/files/zipWriter.js';

/** Folder for the files of a test; removed with `removeTestDir` */
export const testDir = (prefix: string) => fs.mkdtempSync(path.join(os.tmpdir(), `cognatio-${prefix}-`));

export const removeTestDir = (dir: string) => fs.rmSync(dir, { recursive: true, force: true });

let counter = 0;

/** Writes content into a new file of `dir` and returns its path (an uploaded file as the backend sees it) */
export function fileWith(dir: string, content: Uint8Array | string, name = `file-${++counter}`) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

/** A ZIP file with the given entries (strings are written as UTF-8) on disk */
export function zipFileWith(dir: string, entries: Record<string, Uint8Array | string>, name?: string) {
  const zippable = Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, typeof value === 'string' ? strToU8(value) : value]));
  return fileWith(dir, zipSync(zippable), name);
}

/** The whole output of a ZIP being written, for checks in tests */
export async function collect(zip: ZipOutput): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of zip.stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
