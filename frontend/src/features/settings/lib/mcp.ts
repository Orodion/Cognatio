/** AI assistants (MCP): levels of a permission, the summary of the section and the configuration of the clients */

export const MCP_LEVELS = ['off', 'read', 'write', 'delete'] as const;
export type McpLevel = (typeof MCP_LEVELS)[number];

export interface McpPermission {
  area: string;
  level: McpLevel;
  /** Levels the area offers, "off" first */
  levels: McpLevel[];
}

export interface McpSettings {
  enabled: boolean;
  address: string | null;
  portChanged: boolean;
  permissions: McpPermission[];
  excludedTrees: string[];
}

const rank = (level: McpLevel) => MCP_LEVELS.indexOf(level);

/** A higher level that needs a warning first: "write" (changes) or "delete" (cannot be undone) */
export function warningFor(from: McpLevel, to: McpLevel): 'write' | 'delete' | null {
  if (rank(to) <= rank(from)) {
    return null;
  }
  return to === 'delete' || to === 'write' ? to : null;
}

/** The levels a checkbox can stand for: everything above "off" */
export const CHECK_LEVELS = ['read', 'write', 'delete'] as const satisfies readonly McpLevel[];
export type CheckLevel = (typeof CHECK_LEVELS)[number];

/** A level of an area is ticked if the area has it or a higher one (a higher level includes the lower ones) */
export const isTicked = (permission: McpPermission, level: CheckLevel) => rank(permission.level) >= rank(level);

/**
 * The level of an area after its box for `level` was ticked or unticked: ticking sets the level (the lower ones are
 * included), unticking falls back to the next lower level the area offers ("off" below "read")
 */
export function levelAfter(permission: McpPermission, level: CheckLevel, ticked: boolean): McpLevel {
  if (ticked) {
    return rank(permission.level) >= rank(level) ? permission.level : level;
  }
  if (rank(permission.level) < rank(level)) {
    return permission.level;
  }
  const lower = permission.levels.filter((l) => rank(l) < rank(level));
  return lower[lower.length - 1] ?? 'off';
}

export interface PermissionChange {
  area: string;
  level: McpLevel;
  from: McpLevel;
}

/**
 * The changes when the box of a level is ticked or unticked for all areas at once: every area that offers the level
 * gets it (ticked) or falls below it (unticked); an area without it (backup has no "write") takes its next lower level
 * when ticking
 */
export function changesForAll(permissions: McpPermission[], level: CheckLevel, ticked: boolean): PermissionChange[] {
  return permissions
    .map((p) => {
      const target = ticked ? ([...p.levels].reverse().find((l) => rank(l) <= rank(level)) ?? 'off') : level;
      const next = ticked ? (rank(p.level) >= rank(target) ? p.level : target) : levelAfter(p, level, false);
      return { area: p.area, level: next, from: p.level };
    })
    .filter((change) => change.level !== change.from);
}

/** State of the box of a level in the row "all areas": ticked, partly ticked or not ticked */
export function allState(permissions: McpPermission[], level: CheckLevel): 'all' | 'some' | 'none' {
  const offering = permissions.filter((p) => p.levels.includes(level));
  const ticked = offering.filter((p) => isTicked(p, level)).length;
  return ticked === 0 ? 'none' : ticked === offering.length ? 'all' : 'some';
}

/** The strongest warning a set of changes needs: "delete" before "write" */
export function warningForChanges(changes: PermissionChange[]): 'write' | 'delete' | null {
  const warnings = changes.map((c) => warningFor(c.from, c.level));
  return warnings.includes('delete') ? 'delete' : warnings.includes('write') ? 'write' : null;
}

/** Summary next to the switch: off, nothing, read only, read and write, also deleting, everything allowed */
export type McpSummary = 'off' | 'nothing' | 'readOnly' | 'readWrite' | 'withDelete' | 'everything';

export function permissionSummary(settings: Pick<McpSettings, 'enabled' | 'permissions'>): McpSummary {
  if (!settings.enabled) {
    return 'off';
  }
  const levels = settings.permissions.map((p) => p.level);
  if (settings.permissions.every((p) => p.level === p.levels[p.levels.length - 1])) {
    return 'everything';
  }
  if (levels.includes('delete')) {
    return 'withDelete';
  }
  if (levels.includes('write')) {
    return 'readWrite';
  }
  return levels.includes('read') ? 'readOnly' : 'nothing';
}

/** Name of the server in the configuration of the clients */
export const SERVER_NAME = 'cognatio';

/** Command for Claude Code */
export const claudeCodeCommand = (address: string, token: string) =>
  `claude mcp add --transport http ${SERVER_NAME} ${address} --header "Authorization: Bearer ${token}"`;

/** JSON block for clients that read their servers from a file with "mcpServers" (e.g. .mcp.json of Claude Code) */
export const clientJson = (address: string, token: string) =>
  JSON.stringify({ mcpServers: { [SERVER_NAME]: { type: 'http', url: address, headers: { Authorization: `Bearer ${token}` } } } }, null, 2);
