import fs from 'node:fs';
import { Readable, Transform, type TransformCallback } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import zlib from 'node:zlib';
import yauzl from 'yauzl';
import { TransferError } from '../transfer/format.js';
import { toMb } from '../transfer/limits.js';

/** One file of an archive: its size, its CRC32 (from the ZIP) and a way to read it piece by piece */
interface Source {
  size: number;
  crc32?: number;
  open: () => Promise<Readable>;
}

/**
 * Largest entry that is read into memory: the records (persons.json, data.json, gedcom.ged); far above real family
 * trees and below the longest string of V8 (about 512 MB), which JSON.parse needs.
 */
export const RECORDS_MAX_BYTES = 500 * 1024 * 1024;

/** Reason of the error when an entry turns out to be damaged while it is read: import or backup */
export type DamagedReason = 'INVALID_ZIP' | 'BACKUP_INVALID';

/** Counts the bytes of an entry and compares size and CRC32 with the ZIP at the end – a cut or damaged file fails */
class Check extends Transform {
  private bytes = 0;
  private crc = 0;
  constructor(
    private readonly name: string,
    private readonly source: Source,
    private readonly reason: DamagedReason,
    private readonly progress?: (bytes: number) => void,
  ) {
    super();
  }
  _transform(chunk: Buffer, _encoding: BufferEncoding, done: TransformCallback) {
    this.bytes += chunk.length;
    this.progress?.(chunk.length);
    if (this.source.crc32 !== undefined) {
      this.crc = zlib.crc32(chunk, this.crc);
    }
    done(null, chunk);
  }
  _flush(done: TransformCallback) {
    if (this.bytes !== this.source.size || (this.source.crc32 !== undefined && this.crc !== this.source.crc32)) {
      done(new TransferError(this.reason, [`${this.name}: damaged (size or checksum does not match)`]));
      return;
    }
    done();
  }
}

/**
 * The files of an import or backup file. Nothing is read into memory: an entry is copied to a file piece by piece
 * and checked on the way (size, CRC32). Several names can lead to the same entry (GEDZIP with a subfolder).
 */
export class ArchiveFiles {
  constructor(
    private readonly entries: Map<string, Source>,
    private readonly reason: DamagedReason = 'INVALID_ZIP',
  ) {}

  /** Files from memory (tests, files without an archive) */
  static fromBuffers(files: Record<string, Uint8Array> | Map<string, Uint8Array>, reason?: DamagedReason) {
    const entries = new Map<string, Source>();
    for (const [name, content] of files instanceof Map ? files : Object.entries(files)) {
      entries.set(name, { size: content.length, open: async () => Readable.from([Buffer.from(content)]) });
    }
    return new ArchiveFiles(entries, reason);
  }

  names(): string[] {
    return [...this.entries.keys()];
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  size(name: string): number {
    return this.source(name).size;
  }

  /** Sum of the sizes of the given entries (missing ones count 0) */
  totalSize(names: Iterable<string>): number {
    let total = 0;
    for (const name of new Set(names)) {
      total += this.entries.get(name)?.size ?? 0;
    }
    return total;
  }

  /** The same files under other names: `[new name, name in this archive]` */
  view(names: Iterable<[string, string]>): ArchiveFiles {
    const entries = new Map<string, Source>();
    for (const [alias, name] of names) {
      const source = this.entries.get(name);
      if (source) {
        entries.set(alias, source);
      }
    }
    return new ArchiveFiles(entries, this.reason);
  }

  /** Copies an entry to `target`; a damaged entry fails and leaves no file behind. `progress` gets the bytes copied. */
  async copyTo(name: string, target: string, progress?: (bytes: number) => void): Promise<void> {
    const source = this.source(name);
    try {
      await pipeline(await source.open(), new Check(name, source, this.reason, progress), fs.createWriteStream(target));
    } catch (err) {
      fs.rmSync(target, { force: true });
      throw err instanceof TransferError ? err : new TransferError(this.reason, [`${name}: ${(err as Error).message}`]);
    }
  }

  /** Content of a small entry (persons.json, data.json, gedcom.ged) – the records are held in memory */
  async read(name: string): Promise<Buffer> {
    const source = this.source(name);
    if (source.size > RECORDS_MAX_BYTES) {
      throw new TransferError(this.reason, [`${name}: ${source.size} bytes, at most ${RECORDS_MAX_BYTES} for the records`]);
    }
    const chunks: Buffer[] = [];
    const check = new Check(name, source, this.reason);
    check.on('data', (chunk: Buffer) => chunks.push(chunk));
    try {
      await pipeline(await source.open(), check);
    } catch (err) {
      throw err instanceof TransferError ? err : new TransferError(this.reason, [`${name}: ${(err as Error).message}`]);
    }
    return Buffer.concat(chunks);
  }

  private source(name: string): Source {
    const source = this.entries.get(name);
    if (!source) {
      throw new TransferError(this.reason, [`${name} is missing`]);
    }
    return source;
  }
}

export interface OpenArchive {
  files: ArchiveFiles;
  /** Closes the file; afterwards the entries can no longer be read */
  close: () => void;
}

/** Content of a file that is read as a whole (a GEDCOM file); null if it is larger than `maxBytes` */
export function readWholeFile(filePath: string, maxBytes = RECORDS_MAX_BYTES): Buffer | null {
  return fs.statSync(filePath).size > maxBytes ? null : fs.readFileSync(filePath);
}

/** True if the file starts like a ZIP file */
export function looksLikeZip(filePath: string): boolean {
  const head = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  try {
    return fs.readSync(fd, head, 0, 4, 0) === 4 && head[0] === 0x50 && head[1] === 0x4b;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Opens a ZIP file on disk (also ZIP64, above 4 GB) and reads only its table of contents. The unpacked size is
 * checked against `maxUnpackedBytes` before anything is unpacked (protection against "zip bombs"). Names that would
 * lead out of a folder ("..", absolute paths) are refused by yauzl; folders are skipped.
 */
export async function openArchive(filePath: string, reason: DamagedReason, maxUnpackedBytes = Infinity): Promise<OpenArchive> {
  let zip: yauzl.ZipFile;
  try {
    zip = await yauzl.openPromise(filePath, { lazyEntries: true, autoClose: false, validateEntrySizes: true });
  } catch (err) {
    throw new TransferError(reason, [(err as Error).message]);
  }
  const entries = new Map<string, Source>();
  let unpacked = 0;
  try {
    for await (const entry of zip.eachEntry()) {
      if (entry.fileName.endsWith('/')) {
        continue;
      }
      unpacked += entry.uncompressedSize;
      if (unpacked > maxUnpackedBytes) {
        throw new TransferError('UNPACKED_TOO_LARGE', [`Unpacked larger than ${maxUnpackedBytes} bytes`], { limitMb: toMb(maxUnpackedBytes) });
      }
      entries.set(entry.fileName, { size: entry.uncompressedSize, crc32: entry.crc32, open: () => zip.openReadStreamPromise(entry) });
    }
  } catch (err) {
    zip.close();
    throw err instanceof TransferError ? err : new TransferError(reason, [(err as Error).message]);
  }
  return { files: new ArchiveFiles(entries, reason), close: () => zip.close() };
}
