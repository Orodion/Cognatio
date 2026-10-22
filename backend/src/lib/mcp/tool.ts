import { z } from 'zod';
import { allows, type McpArea, type McpLevel, type McpPermissions } from './permissions.js';

/** A family tree as tools name it */
export interface McpTree {
  id: string;
  name: string;
}

/** A GraphQL operation run on the server of the app (same validation and rules as for the app) */
export type Gql = <T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>) => Promise<T>;

/** What a tool gets besides its arguments */
export interface ToolContext {
  /** Operations in the family tree of the call (tools without a family tree: in the default one, if any) */
  gql: Gql;
  /** The family tree of the call; null for tools that work on all family trees */
  tree: McpTree | null;
  /** True if the permissions of this moment reach `level` in `area` (e.g. include citations when sources are readable) */
  can: (area: McpArea, level: McpLevel) => boolean;
  /** The family trees the assistant may see */
  trees: () => Promise<McpTree[]>;
}

/** The answer of a tool; `target` names what was changed for the page "Activity" (e.g. the person) */
export interface ToolResult {
  data: unknown;
  target?: string | null;
}

export interface ToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> {
  /** snake_case, read by the model */
  name: string;
  title: string;
  /** English, read by the model */
  description: string;
  /** The permission the tool needs; with several areas one of them is enough (get_job: import/export or backup) */
  area: McpArea | readonly McpArea[];
  level: McpLevel;
  /** Works in one family tree: gets the optional parameter `familyTree` */
  inTree?: boolean;
  input: Shape;
  run: (args: z.infer<z.ZodObject<Shape>>, context: ToolContext) => Promise<ToolResult>;
}

/** A tool of any shape, as the registry keeps it */
export type AnyTool = ToolDefinition<z.ZodRawShape>;

export const defineTool = <Shape extends z.ZodRawShape>(tool: ToolDefinition<Shape>) => tool as unknown as AnyTool;

/** A refusal or error the model gets as the answer of the tool: a reason it can act on and a message */
export class McpToolError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}

/** Optional text; an empty string clears the field */
export const text = (description: string) => z.string().max(10_000).nullable().optional().describe(description);

export const id = (description: string) => z.string().min(1).max(100).describe(description);

/** Page of a list (1-based) */
export const page = z.number().int().min(1).max(10_000).optional().describe('Page of the list, starting at 1 (default 1)');

/** Cuts a list into pages of `size` */
export function paged<T>(items: T[], pageNumber = 1, size = 50) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  return { total: items.length, page: pageNumber, pages, items: items.slice((pageNumber - 1) * size, pageNumber * size) };
}

/** True if the permissions allow the tool */
export const toolAllowed = (permissions: McpPermissions, tool: Pick<AnyTool, 'area' | 'level'>) =>
  (Array.isArray(tool.area) ? tool.area : [tool.area]).some((area: McpArea) => allows(permissions, area, tool.level));
