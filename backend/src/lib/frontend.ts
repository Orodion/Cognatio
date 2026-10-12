import express, { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import helmet from 'helmet';

/** Paths that belong to the backend – an unknown one is a 404, not the web page */
const BACKEND_PATHS = /^\/(api|graphql|uploads)(\/|$)/;

/**
 * Policy for the web page itself: only own scripts, inline styles (React style attributes, chart libraries),
 * images from the data folder, from data: and blob: URLs (cropped avatars, tree export).
 */
export const uiCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    fontSrc: ["'self'", 'data:'],
    mediaSrc: ["'self'", 'blob:'],
    objectSrc: ["'self'"],
    connectSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
  },
});

/** FRONTEND_DIR with an index.html, otherwise null (development and API-only operation) */
export function frontendDir(env: NodeJS.ProcessEnv = process.env): string | null {
  const dir = env.FRONTEND_DIR?.trim();
  if (!dir) {
    return null;
  }
  const resolved = path.resolve(dir);
  if (!fs.existsSync(path.join(resolved, 'index.html'))) {
    throw new Error(`FRONTEND_DIR ${resolved} does not contain an index.html – run "npm run build -w frontend"`);
  }
  return resolved;
}

/**
 * Serves the built frontend with fallback to index.html for client-side routes (desktop app, any setup
 * without a separate web server). Hashed files below /assets are cached for a year, index.html never.
 */
export function serveFrontend(dir: string): Router {
  const router = Router();
  const indexFile = path.join(dir, 'index.html');
  router.use(uiCsp);
  router.use(
    express.static(dir, {
      index: false,
      setHeaders: (res, file) => {
        const hashed = path.relative(dir, file).split(path.sep)[0] === 'assets';
        res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    }),
  );
  router.get('*', (req, res, next) => {
    if (BACKEND_PATHS.test(req.path) || path.extname(req.path) || !req.accepts('html')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return router;
}
