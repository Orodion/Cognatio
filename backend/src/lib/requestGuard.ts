import net from 'node:net';
import type { RequestHandler } from 'express';

/** Host name of a Host header without port and brackets ("[::1]:4000" → "::1", "localhost.:3000" → "localhost") */
export function hostName(header: string | undefined): string | null {
  const value = header?.trim().toLowerCase();
  if (!value) {
    return null;
  }
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end > 1 ? value.slice(1, end) : null;
  }
  return value.split(':')[0].replace(/\.$/, '') || null;
}

/** ALLOWED_HOSTS: further host names, comma-separated (e.g. the domain of a reverse proxy in front of the backend) */
export function allowedHosts(value = process.env.ALLOWED_HOSTS): string[] {
  return (value ?? '')
    .split(',')
    .map((name) => hostName(name.trim()) ?? '')
    .filter(Boolean);
}

/**
 * IP addresses (they cannot be rebound to another server), `localhost` with its subdomains and the names in
 * ALLOWED_HOSTS. A web page that points a name of its own to 127.0.0.1 (DNS rebinding) sends that name and is refused.
 */
export function hostAllowed(host: string | null, extra: string[] = []): boolean {
  if (!host) {
    return false;
  }
  return net.isIP(host) !== 0 || host === 'localhost' || host.endsWith('.localhost') || extra.includes(host);
}

/** Refuses requests whose Host header names a host that is not allowed (protection against DNS rebinding) */
export function hostCheck(extra = allowedHosts()): RequestHandler {
  return (req, res, next) => {
    if (hostAllowed(hostName(req.headers.host), extra)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Host not allowed', reason: 'HOST_NOT_ALLOWED' });
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const sameHost = (origin: string, host: string | undefined) => {
  try {
    return !!host && new URL(origin).host === host.toLowerCase();
  } catch {
    return false;
  }
};

/**
 * Changes only from the page of the app itself (or an origin in CORS_ORIGINS). A foreign web page can send a form or a
 * `fetch` in "no-cors" mode to the backend without a preflight – multipart uploads such as a restore or an import would
 * get through. Browsers name the sender in `Sec-Fetch-Site` (older ones only in `Origin`); requests without either come
 * from programs, not from a web page (scripts, tests), and are let through.
 */
export function sameOriginWrites(origins: string[] = []): RequestHandler {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || (origin && origins.includes(origin))) {
      next();
      return;
    }
    const site = req.get('sec-fetch-site');
    const foreign = site ? site !== 'same-origin' && site !== 'none' : !!origin && !sameHost(origin, req.headers.host);
    if (!foreign) {
      next();
      return;
    }
    res.status(403).json({ error: 'Request from another website', reason: 'CROSS_SITE_REQUEST' });
  };
}
