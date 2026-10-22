import type { NextFunction, Request, Response } from 'express';
import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import type { Logger } from './logger.js';

/**
 * Access log: one line per request with method, path, status and duration.
 * Changes (mutations, uploads, import) and exports are logged at INFO, plain reads
 * (GraphQL queries, images, health check) at DEBUG, error responses at WARN (4xx) or ERROR (5xx) – except refusals
 * a route marks as part of the normal course (`res.locals.expectedRefusal`, e.g. the version probe of an MCP client),
 * which stay at DEBUG.
 * Content such as GraphQL variables is not logged – it contains personal data.
 */
export function requestLogger(log: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const body = req.body as { operationName?: unknown; query?: unknown } | undefined;
      const graphql = req.originalUrl.startsWith('/graphql') && typeof body?.query === 'string';
      const mutation = graphql && /^\s*mutation\b/.test(body.query as string);
      const routine = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS' || (graphql && !mutation);
      const important = !routine || req.originalUrl.startsWith('/api/v1/export');
      const expected = res.locals.expectedRefusal === true && res.statusCode < 500;
      const level = expected ? 'debug' : res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : important ? 'info' : 'debug';
      if (!log.isEnabled(level)) {
        return;
      }

      log.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
        ...(graphql ? { operation: typeof body.operationName === 'string' ? body.operationName : null, operationType: mutation ? 'mutation' : 'query' } : {}),
        ip: req.ip,
      });
    });
    next();
  };
}

/**
 * Logs GraphQL errors that would otherwise only appear in the response to the browser.
 * Deliberately thrown errors (validation, not found …) are warnings,
 * unexpected ones (e.g. database errors) are logged as errors with a stack trace.
 */
export function graphqlLogging(log: Logger): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors({ errors, operationName, operation }) {
          for (const error of errors) {
            const fields = {
              operation: operationName ?? null,
              operationType: operation?.operation ?? null,
              path: error.path?.join('.') ?? null,
              code: error.extensions?.code ?? null,
              reason: error.extensions?.reason ?? null,
            };
            const original = error.originalError;
            if (original && !(original instanceof GraphQLError)) {
              log.error(`GraphQL error: ${error.message}`, { ...fields, err: original });
            } else {
              log.warn(`GraphQL error: ${error.message}`, fields);
            }
          }
        },
      };
    },
  };
}

/** Errors no route handled itself: log them and answer neutrally */
export function errorHandler(log: Logger) {
  // Express recognises error middleware by its four parameters
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    // Errors with a client status (e.g. invalid JSON in the body) are errors of the request, not of the server
    const status = (err as { status?: unknown } | null)?.status;
    const clientError = typeof status === 'number' && status >= 400 && status < 500;
    if (clientError) {
      log.warn('Bad request', { method: req.method, url: req.originalUrl, status, error: (err as Error).message });
    } else {
      log.error('Unhandled error', { method: req.method, url: req.originalUrl, err });
    }
    if (res.headersSent) {
      return next(err);
    }
    if (clientError) {
      return res.status(status).json({ error: 'Bad request', reason: 'BAD_REQUEST' });
    }
    return res.status(500).json({ error: 'Internal server error', reason: 'INTERNAL_ERROR' });
  };
}
