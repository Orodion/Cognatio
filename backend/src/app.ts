import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import helmet from 'helmet';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { errorHandler, graphqlLogging, requestLogger } from './lib/requestLogging.js';
import mediaRoutes from './routes/mediaRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import logRoutes from './routes/logRoutes.js';
import { uploadDir } from './lib/files/uploads.js';
import { lazyTree, requestedTree, TREE_HEADER } from './lib/treeScope.js';
import { accessToken, TOKEN_HEADER } from './lib/accessToken.js';
import { frontendDir, serveFrontend } from './lib/frontend.js';
import { hostCheck, sameOriginWrites } from './lib/requestGuard.js';

const httpLog = logger.child({ component: 'http' });
const graphqlLog = logger.child({ component: 'graphql' });

/**
 * Foreign websites must not call the API on behalf of the browser. The frontend runs under the same
 * address (Vite proxy, later nginx) and needs no CORS. Further origins (e.g. Apollo Studio)
 * can be allowed as a comma-separated list in CORS_ORIGINS.
 */
export function allowedOrigins(value = process.env.CORS_ORIGINS) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Strict Content-Security-Policy for API responses and uploaded files: images, PDFs and videos
 * are displayed, scripts in uploaded HTML or SVG files do not run. /graphql is
 * excluded so the Apollo sandbox works during development.
 */
const strictCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'none'"],
    imgSrc: ["'self'", 'data:'],
    mediaSrc: ["'self'"],
    // Chrome shows PDFs via an internal <embed> – without object-src 'self' the page would stay empty
    objectSrc: ["'self'"],
    styleSrc: ["'unsafe-inline'"],
    frameAncestors: ["'self'"],
  },
});

/**
 * Any file type can be uploaded, but only types that cannot run code are shown by the browser (images, PDF, video,
 * audio). Everything else (HTML, SVG, ZIP, GPX, ...) is sent as a download and never interpreted under our address.
 */
const INLINE_EXTENSIONS = new Set([
  ...['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.pdf'],
  ...['.mp4', '.m4v', '.webm', '.ogv', '.mov', '.mp3', '.m4a', '.wav', '.ogg', '.oga', '.opus', '.flac'],
]);

export function downloadUnlessSafe(res: express.Response, filePath: string) {
  if (!INLINE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    res.setHeader('Content-Disposition', 'attachment');
  }
}

/** Express app with GraphQL, REST and upload endpoints (without listen – see index.ts) */
export async function createApp() {
  const app = express();
  app.use(requestLogger(httpLog));
  // Only requests to this backend under its own address (DNS rebinding), changes only from its own page (or CORS_ORIGINS)
  app.use(hostCheck());
  app.use(sameOriginWrites(allowedOrigins()));
  // Security headers (nosniff, frame protection, referrer policy …); HSTS is set by an HTTPS proxy in front
  app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: false }));
  app.use(['/api', '/uploads'], strictCsp);
  // Only with COGNATIO_ACCESS_TOKEN (Windows app): requests need the token of this start
  app.use(accessToken());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    logger: graphqlLog,
    plugins: [graphqlLogging(graphqlLog)],
  });

  await server.start();

  app.use(
    '/graphql',
    cors({ origin: allowedOrigins(), allowedHeaders: ['Content-Type', TREE_HEADER, TOKEN_HEADER] }),
    express.json(),
    expressMiddleware(server, {
      // Active family tree from the header – only checked when a resolver first accesses it
      context: async ({ req }) => ({ prisma, treeId: lazyTree(prisma, requestedTree(req)) }),
    }),
  );

  // Status of the application and the database connection (also for health checks in the CI)
  app.get('/api/v1/health', async (_req, res) => {
    try {
      // SELECT 1 works on every database
      // eslint-disable-next-line no-restricted-syntax
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', database: 'ok' });
    } catch (err) {
      httpLog.error('Health check: database unreachable', { err });
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });

  // Media Uploads & Static files
  app.use('/api/v1/media', mediaRoutes);
  // Export (ZIP, GEDCOM) and import with preview
  app.use('/api/v1', transferRoutes);
  // Backup of all family trees and restore
  app.use('/api/v1', backupRoutes);
  // Log of the server: view and export
  app.use('/api/v1', logRoutes);
  app.use('/uploads', express.static(uploadDir, { setHeaders: downloadUnlessSafe }));

  // Desktop app: the built frontend is served by the backend itself (FRONTEND_DIR)
  const webDir = frontendDir();
  if (webDir) {
    app.use(serveFrontend(webDir));
  }

  app.use(errorHandler(httpLog));
  return app;
}
