/**
 * True if `url` belongs to exactly this origin (scheme, host and port). A plain prefix comparison is not enough:
 * `http://127.0.0.1:5123@other.example/` (user part of the address) and `http://127.0.0.1:51234` start with the same text.
 */
export function isSameOrigin(url: string | undefined | null, origin: string): boolean {
  if (!url) {
    return false;
  }
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

/**
 * Title of a window that shows an uploaded file of the backend: its original name (`?name=`), else nothing – never
 * the title inside the file (PDFs often carry a meaningless one such as "(anonymous)"). Undefined for any other page.
 */
export function viewerTitle(url: string, origin: string): string | undefined {
  if (!isSameOrigin(url, origin)) {
    return undefined;
  }
  const { pathname, searchParams } = new URL(url);
  return pathname.startsWith('/uploads/') ? (searchParams.get('name') ?? '').trim() : undefined;
}

/** The only permission a page may get: writing text into the clipboard (copy buttons), and only the page of the app */
export function permissionAllowed(permission: string, url: string | undefined | null, origin: string | null | undefined): boolean {
  return permission === 'clipboard-sanitized-write' && !!origin && isSameOrigin(url, origin);
}
