import path from 'node:path';

/**
 * Any file type can be uploaded, but only types that cannot run code are shown by the browser: images, PDF, video,
 * audio – and text files, which are sent as plain text. Everything else (HTML, SVG, ZIP, ...) is sent as a download
 * and never interpreted under our address.
 */
const INLINE_EXTENSIONS = new Set([
  ...['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.pdf'],
  ...['.mp4', '.m4v', '.webm', '.ogv', '.mov', '.mp3', '.m4a', '.wav', '.ogg', '.oga', '.opus', '.flac'],
]);

/** Text files: shown as plain text (never as HTML or XML that could run code) */
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.xml', '.gpx', '.kml', '.ged', '.log', '.ini', '.yaml', '.yml']);

const extension = (fileName: string) => path.extname(fileName).toLowerCase();

/** True if the browser shows the file itself; else it is offered as a download */
export const isViewable = (fileName: string) => INLINE_EXTENSIONS.has(extension(fileName)) || TEXT_EXTENSIONS.has(extension(fileName));

/** Content type for a text file shown as plain text; undefined for all other files */
export const plainTextType = (fileName: string) => (TEXT_EXTENSIONS.has(extension(fileName)) ? 'text/plain; charset=utf-8' : undefined);

/** Header value that names the file, e.g. for the title of a viewer and for "Save as": inline or as a download */
export function contentDisposition(kind: 'inline' | 'attachment', name?: string) {
  // Without control characters, quotes and path separators
  const clean = [...(name ?? '')]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f && !'"\\/'.includes(c))
    .join('')
    .trim();
  if (!clean) {
    return kind;
  }
  // ASCII fallback for old clients, the full name UTF-8 encoded (RFC 6266, RFC 8187)
  const ascii = [...clean].map((c) => (c.charCodeAt(0) < 0x7f ? c : '_')).join('');
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
