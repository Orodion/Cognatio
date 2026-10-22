import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { errorHandler, graphqlLogging, requestLogger } from './lib/requestLogging.js';
import mediaRoutes from './routes/mediaRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import { clearStagedUploads } from './lib/files/stagedUploads.js';
import backupRoutes from './routes/backupRoutes.js';
import logRoutes from './routes/logRoutes.js';
import { uploadDir } from './lib/files/uploads.js';
import { contentDisposition, isViewable, plainTextType } from './lib/files/viewable.js';
import { lazyTree, requestedTree, TREE_HEADER, type GraphQLContext } from './lib/treeScope.js';
import { mcpRouter } from './lib/mcp/route.js';
import { graphqlRunner } from './lib/mcp/graphql.js';
import { rememberAppTree } from './lib/mcp/trees.js';
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
 * Headers of an uploaded file: shown by the browser if it cannot run code (text files as plain text), else a download.
 * `?name=` gives the original name – the title of a viewer and the name for "Save as".
 */
export function uploadHeaders(res: express.Response, filePath: string) {
  const name = typeof res.req.query.name === 'string' ? res.req.query.name : undefined;
  if (!isViewable(filePath)) {
    res.setHeader('Content-Disposition', contentDisposition('attachment', name));
    return;
  }
  const text = plainTextType(filePath);
  if (text) {
    res.setHeader('Content-Type', text);
  }
  if (name) {
    res.setHeader('Content-Disposition', contentDisposition('inline', name));
  }
}

/** Express app with GraphQL, REST and upload endpoints (without listen – see index.ts) */
export async function createApp() {
  // Import and backup files of an earlier run are no longer referred to
  clearStagedUploads();
  const app = express();
  app.use(requestLogger(httpLog));
  // Only requests to this backend under its own address (DNS rebinding), changes only from its own page (or CORS_ORIGINS)
  app.use(hostCheck());
  app.use(sameOriginWrites(allowedOrigins()));
  // Security headers (nosniff, frame protection, referrer policy …); HSTS is set by an HTTPS proxy in front
  app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: false }));
  app.use(['/api', '/uploads'], strictCsp);
  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    logger: graphqlLog,
    plugins: [graphqlLogging(graphqlLog)],
  });

  await server.start();

  // AI assistants (MCP): an own token and own permissions (settings → MCP), therefore before the token of the app
  app.use('/mcp', mcpRouter(graphqlRunner(server, prisma)));
  // Only with COGNATIO_ACCESS_TOKEN (Windows app): requests need the token of this start
  app.use(accessToken());

  app.use(
    '/graphql',
    cors({ origin: allowedOrigins(), allowedHeaders: ['Content-Type', TREE_HEADER, TOKEN_HEADER] }),
    express.json(),
    expressMiddleware(server, {
      // Active family tree from the header – only checked when a resolver first accesses it
      context: async ({ req }) => {
        const requested = requestedTree(req);
        // An assistant that names no family tree works in the one the app shows
        rememberAppTree(requested);
        return { prisma, treeId: lazyTree(prisma, requested) };
      },
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
  // Progress of long operations (import, restore)
  app.use('/api/v1', jobRoutes);
  // Log of the server: view and export
  app.use('/api/v1', logRoutes);
  app.use('/uploads', express.static(uploadDir, { setHeaders: uploadHeaders }));

  // Desktop app: the built frontend is served by the backend itself (FRONTEND_DIR)
  const webDir = frontendDir();
  if (webDir) {
    app.use(serveFrontend(webDir));
  }

  app.use(errorHandler(httpLog));
  return app;
}
