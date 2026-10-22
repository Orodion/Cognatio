/**
 * What an AI assistant may do through MCP, set per area of the data in the settings section "MCP". A higher level
 * includes the lower ones: "read" looks up, "write" creates and changes (and moves into the recycle bin – can be undone
 * in the app), "delete" removes for good or replaces data (cannot be undone).
 */
export const MCP_LEVELS = ['off', 'read', 'write', 'delete'] as const;
export type McpLevel = (typeof MCP_LEVELS)[number];

/**
 * The areas in the order of the settings page; each offers every level above "off". Where a level adds no tool (e.g.
 * "delete" for statistics) it simply grants nothing more, so "all areas" can be ticked at every level.
 */
const ALL_LEVELS = ['read', 'write', 'delete'] as const;
export const MCP_AREAS = {
  // delete: life events and notes, which the app deletes for good as well
  persons: ALL_LEVELS,
  // delete: a citation for good, with its links in all family trees
  sources: ALL_LEVELS,
  media: ALL_LEVELS,
  // delete: a family tree in the recycle bin for good (with "recycle bin: delete")
  familyTrees: ALL_LEVELS,
  recycleBin: ALL_LEVELS,
  transfer: ALL_LEVELS,
  // write: create a backup; delete: restore one
  backup: ALL_LEVELS,
  settings: ALL_LEVELS,
  statistics: ALL_LEVELS,
} as const satisfies Record<string, readonly McpLevel[]>;

export type McpArea = keyof typeof MCP_AREAS;
export type McpPermissions = Record<McpArea, McpLevel>;

export const AREA_NAMES = Object.keys(MCP_AREAS) as McpArea[];

const rank = (level: McpLevel) => MCP_LEVELS.indexOf(level);

/** True if the permission of `area` reaches `level` */
export const allows = (permissions: McpPermissions, area: McpArea, level: McpLevel) => rank(permissions[area]) >= rank(level);

/** Every area "read" – the state right after switching MCP on */
export const readOnlyPermissions = (): McpPermissions => Object.fromEntries(AREA_NAMES.map((area) => [area, 'read'])) as McpPermissions;

/** Every area "off" – MCP switched off */
export const noPermissions = (): McpPermissions => Object.fromEntries(AREA_NAMES.map((area) => [area, 'off'])) as McpPermissions;

/**
 * A level the area offers: an unknown value counts as "off", a level the area does not have becomes the highest one
 * below it (backup "write" → "read")
 */
export function areaLevel(area: McpArea, value: unknown): McpLevel {
  if (typeof value !== 'string' || !(MCP_LEVELS as readonly string[]).includes(value)) {
    return 'off';
  }
  const offered: readonly McpLevel[] = MCP_AREAS[area];
  const fitting = offered.filter((level) => rank(level) <= rank(value as McpLevel));
  return fitting.length ? fitting[fitting.length - 1] : 'off';
}

/** Permissions from the settings file or an input; missing areas are "off" */
export function normalizePermissions(value: unknown): McpPermissions {
  const given = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(AREA_NAMES.map((area) => [area, areaLevel(area, given[area])])) as McpPermissions;
}
