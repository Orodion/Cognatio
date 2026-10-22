import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readAppSettings, writeAppSettings } from '../files/appSettings.js';
import { normalizePermissions, readOnlyPermissions, type McpPermissions } from './permissions.js';

/**
 * The settings section "MCP", kept in settings.json next to the size limits: switched on or off, the hash of the token
 * (the token itself is shown once and never stored), the permissions per area and the family trees an assistant does
 * not see. Read anew for every request, so a change applies at once and needs no restart.
 */
export interface McpConfig {
  enabled: boolean;
  tokenHash: string | null;
  permissions: McpPermissions;
  excludedTrees: string[];
}

const KEY = 'mcp';
const TOKEN_BYTES = 32;

export const hashToken = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');

export function readMcpConfig(): McpConfig {
  const stored = readAppSettings()[KEY];
  const value = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
  const tokenHash = typeof value.tokenHash === 'string' && /^[0-9a-f]{64}$/.test(value.tokenHash) ? value.tokenHash : null;
  return {
    // Without a token nobody can connect: then it counts as switched off
    enabled: value.enabled === true && tokenHash !== null,
    tokenHash,
    permissions: normalizePermissions(value.permissions),
    excludedTrees: Array.isArray(value.excludedTrees) ? value.excludedTrees.filter((id): id is string => typeof id === 'string') : [],
  };
}

function saveMcpConfig(config: McpConfig) {
  writeAppSettings({ [KEY]: config });
  return config;
}

const newToken = () => randomBytes(TOKEN_BYTES).toString('base64url');

/** Switches MCP on with a new token and every area "read"; the token is returned once */
export function enableMcp(): { config: McpConfig; token: string } {
  const token = newToken();
  const config = saveMcpConfig({ enabled: true, tokenHash: hashToken(token), permissions: readOnlyPermissions(), excludedTrees: [] });
  return { config, token };
}

/** Switches MCP off; the token becomes invalid, the next switching on starts again with "read" everywhere */
export function disableMcp(): McpConfig {
  return saveMcpConfig({ ...readMcpConfig(), enabled: false, tokenHash: null });
}

/** Replaces the token (a lost or shared token); the permissions stay */
export function renewMcpToken(): { config: McpConfig; token: string } {
  const token = newToken();
  const config = saveMcpConfig({ ...readMcpConfig(), tokenHash: hashToken(token) });
  return { config, token };
}

export function setMcpPermissions(permissions: unknown): McpConfig {
  return saveMcpConfig({ ...readMcpConfig(), permissions: normalizePermissions(permissions) });
}

export function setMcpExcludedTrees(ids: string[]): McpConfig {
  return saveMcpConfig({ ...readMcpConfig(), excludedTrees: [...new Set(ids)] });
}

/** True if `given` is the token whose hash is stored (compared in constant time) */
export function tokenMatches(given: string | null | undefined, tokenHash: string | null): boolean {
  if (!given || !tokenHash) {
    return false;
  }
  const a = Buffer.from(hashToken(given), 'hex');
  const b = Buffer.from(tokenHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
