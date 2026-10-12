import path from 'path';
import { unzipSync, strFromU8 } from 'fflate';
import { MAX_MEDIA_BYTES, TransferError, validateTransfer, type TransferData } from './format.js';
import { parseGedcom } from './gedcom.js';
import { importMaxUnpackedBytes, toMb } from './limits.js';

export interface ImportFile {
  data: TransferData;
  /** Files from media/, key = path as in persons.json */
  files: Map<string, Uint8Array>;
  kind: 'ZIP' | 'GEDCOM';
}

const isZip = (buf: Buffer) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;

/** Refuses files the database cannot record as a medium (larger than `maxBytes`, 2 GiB) – before anything is written */
export function assertMediaSizes(files: Record<string, Uint8Array>, maxBytes = MAX_MEDIA_BYTES) {
  const tooLarge = Object.entries(files)
    .filter(([, content]) => content.length > maxBytes)
    .map(([name]) => name);
  if (tooLarge.length) {
    throw new TransferError('MEDIA_TOO_LARGE', tooLarge.slice(0, 20), { limitMb: toMb(maxBytes) });
  }
}

/** Reads an uploaded import file: ZIP export of the app or GEDCOM (.ged). */
export function readImportFile(buffer: Buffer, filename: string): ImportFile {
  if (isZip(buffer)) {
    return readZip(buffer);
  }
  const text = decodeText(buffer);
  if (/\.ged$/i.test(filename) || /^\s*0\s+HEAD/.test(text)) {
    return { data: validateTransfer(parseGedcom(text)), files: new Map(), kind: 'GEDCOM' };
  }
  throw new TransferError('UNSUPPORTED_FILE', [`File ${filename} is neither ZIP nor GEDCOM`]);
}

/** Character encoding of a GEDCOM file: UTF-8 (default), UTF-16 (BOM) or ANSI according to "1 CHAR" in the header. */
function decodeText(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return Buffer.from(buffer.subarray(2)).swap16().toString('utf16le');
  }
  const charset = buffer
    .subarray(0, 4096)
    .toString('latin1')
    .match(/^\s*1\s+CHAR\s+(\S+)/m)?.[1]
    ?.toUpperCase();
  if (charset === 'ANSEL') {
    throw new TransferError('UNSUPPORTED_ENCODING', ['ANSEL-encoded GEDCOM files are not supported – please export as UTF-8']);
  }
  if (charset === 'ANSI' || charset === 'WINDOWS-1252' || charset === 'ISO-8859-1') {
    return buffer.toString('latin1');
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

function readZip(buffer: Buffer): ImportFile {
  let entries: Record<string, Uint8Array>;
  let unpacked = 0;
  const limit = importMaxUnpackedBytes();
  try {
    entries = unzipSync(buffer, {
      filter: (file) => {
        unpacked += file.originalSize;
        if (unpacked > limit) {
          throw new TransferError('UNPACKED_TOO_LARGE', [`Unpacked larger than ${limit} bytes`], { limitMb: toMb(limit) });
        }
        return !file.name.endsWith('/');
      },
    });
  } catch (err) {
    if (err instanceof TransferError) {
      throw err;
    }
    throw new TransferError('INVALID_ZIP', [(err as Error).message]);
  }
  assertMediaSizes(entries);

  // persons.json in the root folder – or in a subfolder if the export was repacked
  const jsonPath = Object.keys(entries)
    .filter((name) => path.posix.basename(name) === 'persons.json')
    .sort((a, b) => a.length - b.length)[0];
  if (!jsonPath) {
    const gedcom = readGedzip(entries);
    if (gedcom) {
      return gedcom;
    }
    throw new TransferError('MISSING_PERSONS_JSON', Object.keys(entries).slice(0, 10));
  }
  const prefix = jsonPath.slice(0, -'persons.json'.length);

  let raw: unknown;
  try {
    raw = JSON.parse(strFromU8(entries[jsonPath]).replace(/^\uFEFF/, ''));
  } catch (err) {
    throw new TransferError('INVALID_JSON', [(err as Error).message]);
  }
  const data = validateTransfer(raw);

  const files = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(entries)) {
    if (name.startsWith(prefix) && name !== jsonPath) {
      files.set(name.slice(prefix.length), content);
    }
  }
  return { data, files, kind: 'ZIP' };
}

/**
 * GEDZIP (GEDCOM 7): ZIP file with "gedcom.ged" and the media files. ZIP files of other programs with
 * a GEDCOM file (5.5.1) and media are read the same way. Media paths are relative to the root of the
 * ZIP file; if the GEDCOM file is in a subfolder, also relative to that folder.
 */
function readGedzip(entries: Record<string, Uint8Array>): ImportFile | null {
  const gedPath = Object.keys(entries)
    .filter((name) => /\.ged$/i.test(name))
    .sort((a, b) => Number(path.posix.basename(b) === 'gedcom.ged') - Number(path.posix.basename(a) === 'gedcom.ged') || a.length - b.length)[0];
  if (!gedPath) {
    return null;
  }
  const folder = gedPath.slice(0, gedPath.length - path.posix.basename(gedPath).length);
  const files = new Map<string, Uint8Array>();
  for (const [name, content] of Object.entries(entries)) {
    if (name === gedPath) {
      continue;
    }
    files.set(name, content);
    if (folder && name.startsWith(folder)) {
      files.set(name.slice(folder.length), content);
    }
  }
  const data = validateTransfer(parseGedcom(decodeText(Buffer.from(entries[gedPath])), files));
  // Keep only the files that are actually used
  const used = new Set(data.persons.flatMap((p) => p.media.map((m) => m.path)));
  return { data, files: new Map([...files].filter(([name]) => used.has(name))), kind: 'GEDCOM' };
}
