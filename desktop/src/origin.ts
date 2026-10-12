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
