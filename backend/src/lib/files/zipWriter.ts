import fs from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Response } from 'express';
import yazl from 'yazl';

/** An entry of a ZIP file being written: a file on disk or a small buffer (the records as JSON) */
export type ZipItem = { name: string; file: string } | { name: string; buffer: Buffer };

export interface ZipOutput {
  stream: Readable;
  /** Final size in bytes, known before the first byte is written */
  size: Promise<number>;
}

/**
 * Writes a ZIP file piece by piece: files are read from disk while the archive is sent, never as a whole.
 * Everything is stored without compression (photos and videos are compressed already), so the final size is known
 * in advance – a download shows real progress. ZIP64 is used only where it is needed (above 4 GB or 65 535
 * entries), so small archives stay readable by older versions. Destroying `stream` (a cancelled download) also closes
 * the file that is being read – yazl itself has no way to stop.
 */
export function writeZip(items: ZipItem[], mtime = new Date()): ZipOutput {
  const zip = new yazl.ZipFile();
  const stream = zip.outputStream as Readable;
  const reading = new Set<fs.ReadStream>();
  const fail = (err: Error) => {
    stream.destroy(err);
    reading.forEach((file) => file.destroy());
  };
  stream.once('close', () => reading.forEach((file) => file.destroy()));

  const size = new Promise<number>((resolve, reject) => {
    // A file that vanished or cannot be read: the archive breaks off with the error
    zip.on('error', (err: Error) => {
      reject(err);
      fail(err);
    });
    try {
      for (const item of items) {
        if ('buffer' in item) {
          zip.addBuffer(item.buffer, item.name, { compress: false, mtime });
          continue;
        }
        // The size is given, so the total is known in advance; the file is opened only when it is its turn
        zip.addReadStreamLazy(item.name, { compress: false, mtime, size: fs.statSync(item.file).size }, (callback) => {
          const file = fs.createReadStream(item.file);
          reading.add(file);
          file.once('close', () => reading.delete(file));
          callback(null, file);
        });
      }
    } catch (err) {
      reject(err);
      fail(err as Error);
      return;
    }
    // The type definitions leave out the parameter of the callback
    (zip.end as (options: object, callback: (size: number) => void) => void)({}, resolve);
  });
  // Nobody has to wait for the size; the error then shows in the stream
  size.catch(() => undefined);
  return { stream, size };
}

/**
 * Writes the archive into a file; a half-written file is removed when something fails. `progress` gets the bytes
 * written and may return an error to stop (the user cancelled).
 */
export async function writeZipFile(output: ZipOutput, target: string, progress?: (bytes: number) => Error | void) {
  const temporary = `${target}.part`;
  try {
    if (progress) {
      output.stream.on('data', (chunk: Buffer) => {
        const stop = progress(chunk.length);
        if (stop) {
          output.stream.destroy(stop);
        }
      });
    }
    await pipeline(output.stream, fs.createWriteStream(temporary));
    fs.renameSync(temporary, target);
  } catch (err) {
    fs.rmSync(temporary, { force: true });
    throw err;
  }
}

/** What a download reports while it is sent and how it learns that the user cancelled (see JobControl) */
export interface DownloadWatch {
  advance: (bytes: number) => void;
  onCancel: (listener: () => void) => void;
}

/**
 * Sends a file as a download with its exact size, piece by piece; `watch` counts the bytes sent and can break it off.
 * An error in the middle (a file vanished, the disk failed, the user cancelled) breaks the connection, so the client
 * sees a failed download instead of a damaged file. True if everything was sent.
 */
export async function sendDownload(
  res: Response,
  output: ZipOutput,
  filename: string,
  contentType = 'application/zip',
  watch?: DownloadWatch,
): Promise<boolean> {
  const size = await output.size;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.type(contentType);
  if (size >= 0) {
    res.setHeader('Content-Length', String(size));
  }
  if (watch) {
    output.stream.on('data', (chunk: Buffer) => watch.advance(chunk.length));
    watch.onCancel(() => output.stream.destroy(new Error('cancelled')));
  }
  try {
    await pipeline(output.stream, res);
    return true;
  } catch {
    res.destroy();
    return false;
  }
}

/** A small file from memory (a GEDCOM file without media) as output for `sendDownload` */
export const bufferOutput = (buffer: Buffer): ZipOutput => ({ stream: Readable.from([buffer]), size: Promise.resolve(buffer.length) });
