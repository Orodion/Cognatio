import fs from 'node:fs';

/**
 * Whether the content of a file fits its media type. The type comes from the name (".jpg") or the browser; a text file
 * named "photo.jpg" would then count as a picture and could become a profile picture that does not show. A file named
 * as one of the common pictures has to be a picture (of any of these kinds – a PNG named ".jpg" still shows), one named
 * as PDF a PDF; other types are taken as named.
 */
const PICTURES: Array<(head: Buffer) => boolean> = [
  // JPEG
  (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  // PNG
  (head) => head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  (head) => ['GIF87a', 'GIF89a'].includes(head.toString('latin1', 0, 6)),
  (head) => head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP',
  (head) => head.toString('latin1', 0, 2) === 'BM',
  (head) => ['II*\0', 'MM\0*'].includes(head.toString('latin1', 0, 4)),
  // HEIC/HEIF and AVIF: an ISO media file ("ftyp" box)
  (head) => head.toString('latin1', 4, 8) === 'ftyp',
];

const PICTURE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
]);

// A PDF may have a few bytes before its header
const isPdf = (head: Buffer) => head.includes('%PDF-', 0, 'latin1');

const HEAD_BYTES = 1024;

/** The first bytes of a file */
function headOf(file: string): Buffer {
  const handle = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(HEAD_BYTES);
    const read = fs.readSync(handle, head, 0, HEAD_BYTES, 0);
    return head.subarray(0, read);
  } finally {
    fs.closeSync(handle);
  }
}

/** False if a file named as a picture or PDF (by any of `types`) is none; other files are not checked */
export function contentFits(file: string, types: string[]): boolean {
  const named = types.map((type) => type.toLowerCase());
  const picture = named.some((type) => PICTURE_TYPES.has(type));
  const pdf = named.includes('application/pdf');
  if (!picture && !pdf) {
    return true;
  }
  const head = headOf(file);
  return (picture && PICTURES.some((fits) => fits(head))) || (pdf && isPdf(head));
}
