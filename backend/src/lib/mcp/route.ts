import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger } from '../logger.js';
import { readMcpConfig, tokenMatches } from './config.js';
import type { GqlRunner } from './graphql.js';
import { rememberClient } from './activity.js';
import { createMcpServer } from './server.js';

const log = logger.child({ component: 'mcp' });

/** At most this many requests per second; an assistant in a loop must not keep the app busy */
export const MAX_REQUESTS_PER_SECOND = 20;

/** Requests of the last second, across all clients (there is one user) */
function rateLimit(limit = MAX_REQUESTS_PER_SECOND): express.RequestHandler {
  let times: number[] = [];
  return (_req, res, next) => {
    const now = Date.now();
    times = [...times.filter((time) => now - time < 1000), now];
    if (times.length > limit) {
      res.status(429).setHeader('Retry-After', '1').json({ error: 'Too many requests', reason: 'TOO_MANY_REQUESTS' });
      return;
    }
    next();
  };
}

/**
 * Marks a refusal that belongs to the normal course of a connection, so the access log keeps it out of the warnings:
 * clients first try a newer protocol version and fall back to an older one, and they ask for a stream we do not offer.
 */
const expectedRefusal = (res: express.Response) => {
  res.locals.expectedRefusal = true;
};

const bearer = (header: string | undefined) => header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

/** Names the client gave in `initialize` (also inside a batch) */
function noteClient(body: unknown) {
  for (const message of Array.isArray(body) ? body : [body]) {
    const { method, params } = (message ?? {}) as { method?: unknown; params?: { clientInfo?: { name?: unknown } } };
    if (method === 'initialize') {
      rememberClient(params?.clientInfo?.name);
    }
  }
}

/**
 * The MCP endpoint `/mcp` (Streamable HTTP, stateless: every request stands alone). It has its own token and is
 * therefore mounted before the access protection of the app. Refused: requests of web pages (Origin), without the
 * token or with a wrong one, and everything while MCP is switched off (404, as if the endpoint did not exist).
 */
export function mcpRouter(run: GqlRunner, limit = MAX_REQUESTS_PER_SECOND): express.Router {
  const router = express.Router();

  router.use((req, res, next) => {
    // Assistants are programs; a web page that reaches this address (DNS rebinding, a foreign page) sends an Origin
    if (req.get('origin')) {
      res.status(403).json({ error: 'Requests of web pages are not allowed', reason: 'ORIGIN_NOT_ALLOWED' });
      return;
    }
    const config = readMcpConfig();
    if (!config.enabled) {
      res.status(404).json({ error: 'MCP is switched off', reason: 'MCP_DISABLED' });
      return;
    }
    if (!tokenMatches(bearer(req.get('authorization')), config.tokenHash)) {
      log.warn('MCP request with a missing or wrong token', { ip: req.ip });
      res.status(401).setHeader('WWW-Authenticate', 'Bearer').json({ error: 'MCP token missing or wrong', reason: 'UNAUTHORIZED' });
      return;
    }
    next();
  });
  router.use(rateLimit(limit));

  router.post('/', express.json({ limit: '1mb' }), async (req, res) => {
    noteClient(req.body);
    const server = createMcpServer(readMcpConfig(), run);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    transport.onerror = (error) => {
      if (error.message.includes('Unsupported protocol version')) {
        log.debug('MCP client tried a protocol version this app does not know; it falls back to an older one', {
          version: req.get('mcp-protocol-version') ?? null,
        });
        expectedRefusal(res);
      }
    };
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      log.error('MCP request failed', { err });
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  // Stateless: no stream from the server and no sessions to end
  router.all('/', (_req, res) => {
    expectedRefusal(res);
    res
      .status(405)
      .setHeader('Allow', 'POST')
      .json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });

  return router;
}
