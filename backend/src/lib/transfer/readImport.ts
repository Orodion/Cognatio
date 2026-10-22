import path from 'node:path';
import { ArchiveFiles, RECORDS_MAX_BYTES, looksLikeZip, openArchive, readWholeFile } from '../files/archive.js';
import { TransferError, validateTransfer, type TransferData } from './format.js';
import { parseGedcom } from './gedcom.js';
import { DEFAULT_IMPORT_LANGUAGE, type ImportLanguage } from './languageTexts.js';
import { importMaxUnpackedBytes } from './limits.js';

export interface ImportFile {
  data: TransferData;
  /** Files from media/, key = path as in persons.json; read from the archive only when they are taken over */
  files: ArchiveFiles;
  kind: 'ZIP' | 'GEDCOM';
  /** Closes the import file */
  close: () => void;
}

/**
 * Reads an uploaded import file on disk: ZIP export of the app, GEDZIP or GEDCOM (.ged). Texts that GEDCOM does not
 * give (titles of standard events, words of approximate dates) come in `language`.
 */
export async function readImportFile(filePath: string, filename: string, language: ImportLanguage = DEFAULT_IMPORT_LANGUAGE): Promise<ImportFile> {
  if (looksLikeZip(filePath)) {
    return readZip(filePath, language);
  }
  // A GEDCOM file holds only text: it is read as a whole
  const content = readWholeFile(filePath);
  if (!content) {
    throw new TransferError('UNSUPPORTED_FILE', [`File ${filename} is larger than ${RECORDS_MAX_BYTES} bytes and no ZIP file`]);
  }
  const text = decodeText(content);
  if (/\.ged$/i.test(filename) || /^\s*0\s+HEAD/.test(text)) {
    return { data: validateTransfer(parseGedcom(text, undefined, language)), files: ArchiveFiles.fromBuffers({}), kind: 'GEDCOM', close: () => {} };
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

async function readZip(filePath: string, language: ImportLanguage): Promise<ImportFile> {
  const archive = await openArchive(filePath, 'INVALID_ZIP', importMaxUnpackedBytes());
  try {
    const entries = archive.files;
    // persons.json in the root folder – or in a subfolder if the export was repacked
    const jsonPath = entries
      .names()
      .filter((name) => path.posix.basename(name) === 'persons.json')
      .sort((a, b) => a.length - b.length)[0];
    if (!jsonPath) {
      const gedcom = await readGedzip(entries, language);
      if (gedcom) {
        return { ...gedcom, close: archive.close };
      }
      throw new TransferError('MISSING_PERSONS_JSON', entries.names().slice(0, 10));
    }
    const prefix = jsonPath.slice(0, -'persons.json'.length);

    let raw: unknown;
    try {
      raw = JSON.parse((await entries.read(jsonPath)).toString('utf8').replace(/^\uFEFF/, ''));
    } catch (err) {
      throw err instanceof TransferError ? err : new TransferError('INVALID_JSON', [(err as Error).message]);
    }
    const data = validateTransfer(raw);
    const files = entries.view(
      entries
        .names()
        .filter((name) => name.startsWith(prefix) && name !== jsonPath)
        .map((name) => [name.slice(prefix.length), name]),
    );
    return { data, files, kind: 'ZIP', close: archive.close };
  } catch (err) {
    archive.close();
    throw err;
  }
}

/**
 * GEDZIP (GEDCOM 7): ZIP file with "gedcom.ged" and the media files. ZIP files of other programs with
 * a GEDCOM file (5.5.1) and media are read the same way. Media paths are relative to the root of the
 * ZIP file; if the GEDCOM file is in a subfolder, also relative to that folder.
 */
async function readGedzip(entries: ArchiveFiles, language: ImportLanguage): Promise<Omit<ImportFile, 'close'> | null> {
  const gedPath = entries
    .names()
    .filter((name) => /\.ged$/i.test(name))
    .sort((a, b) => Number(path.posix.basename(b) === 'gedcom.ged') - Number(path.posix.basename(a) === 'gedcom.ged') || a.length - b.length)[0];
  if (!gedPath) {
    return null;
  }
  const folder = gedPath.slice(0, gedPath.length - path.posix.basename(gedPath).length);
  const names: Array<[string, string]> = [];
  for (const name of entries.names()) {
    if (name === gedPath) {
      continue;
    }
    names.push([name, name]);
    if (folder && name.startsWith(folder)) {
      names.push([name.slice(folder.length), name]);
    }
  }
  const files = entries.view(names);
  const data = validateTransfer(parseGedcom(decodeText(await entries.read(gedPath)), files, language));
  // Keep only the files that are actually used
  const used = new Set([...data.persons.flatMap((p) => p.media), ...data.libraryMedia].map((m) => m.path));
  return {
    data,
    files: files.view(
      files
        .names()
        .filter((name) => used.has(name))
        .map((name) => [name, name]),
    ),
    kind: 'GEDCOM',
  };
}
