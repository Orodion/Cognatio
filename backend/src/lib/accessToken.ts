import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export const TOKEN_HEADER = 'X-Cognatio-Token';
export const TOKEN_COOKIE = 'cognatio_token';

/** Paths that answer without the token: the health check carries no data (the Windows app waits for it while starting) */
const OPEN_PATHS = new Set(['/api/v1/health']);

/** Value of a cookie from the Cookie header */
export function cookieValue(header: string | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const sameToken = (given: string | null, expected: string) => {
  if (!given) {
    return false;
  }
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Access protection for a backend that runs on the user's own machine (Windows app, later mobile):
 * with COGNATIO_ACCESS_TOKEN set, every request needs this token in the header `X-Cognatio-Token`
 * or in the cookie `cognatio_token` (for <img> and links, which cannot send headers). Otherwise any web page
 * or any other program on the machine could call the API on 127.0.0.1. Without the setting nothing is checked
 * (development, a server behind its own network).
 */
export function accessToken(token = process.env.COGNATIO_ACCESS_TOKEN): RequestHandler {
  const expected = token?.trim();
  return (req, res, next) => {
    if (!expected || OPEN_PATHS.has(req.path)) {
      next();
      return;
    }
    if (sameToken(req.get(TOKEN_HEADER) ?? null, expected) || sameToken(cookieValue(req.headers.cookie, TOKEN_COOKIE), expected)) {
      next();
      return;
    }
    res.status(401).json({ error: 'Access token missing or wrong', reason: 'UNAUTHORIZED' });
  };
}
