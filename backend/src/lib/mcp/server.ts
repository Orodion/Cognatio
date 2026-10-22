import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../logger.js';
import { LocalFileError } from '../files/localFiles.js';
import { TransferError } from '../transfer/format.js';
import { appVersion } from '../systemInfo.js';
import { readMcpConfig, type McpConfig } from './config.js';
import type { GqlRunner } from './graphql.js';
import { allows } from './permissions.js';
import { addActivity } from './activity.js';
import { accessibleTrees, defaultTree, pickTree } from './trees.js';
import { McpToolError, toolAllowed, type AnyTool, type ToolContext } from './tool.js';
import { ALL_TOOLS } from './tools/index.js';

const log = logger.child({ component: 'mcp' });

/** Answers above this size are cut: the model should ask for the next page instead */
export const MAX_ANSWER_CHARS = 200_000;

const INSTRUCTIONS = `Cognatio is a genealogy app; this server gives access to its family trees on the user's computer.
- Every tool that works on persons takes an optional "familyTree" (id or name); without it the family tree the app shows applies. list_family_trees names them.
- Dates of persons and life events are text as the user types them: "14.09.1951" (exact), "09.1951" (month), "1951" (year), "um 1951" or "1951-1953" (approximate). ISO dates (1951-09-14) are accepted as well.
- A relation reads "relatedPerson is the <relation> of person": relation MOTHER with person = child and relatedPerson = mother.
- Deleting a person, a relation, a source or a family tree moves it into the recycle bin; the user can restore it in the app.
- Look a person up (search, get_person) before creating one: create_person warns about possible duplicates.
- Lists are paged; ask for the next page instead of everything at once.`;

/** Ids among the arguments of a call, for the log (no field values beyond ids) */
function idsOf(args: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(args).filter(([key, value]) => /id$/i.test(key) && (typeof value === 'string' || Array.isArray(value))));
}

const answer = (value: unknown): CallToolResult => {
  const json = JSON.stringify(value, null, 1);
  const textValue =
    json.length > MAX_ANSWER_CHARS ? `${json.slice(0, MAX_ANSWER_CHARS)}\n… (answer cut after ${MAX_ANSWER_CHARS} characters – ask for a smaller page)` : json;
  return { content: [{ type: 'text', text: textValue }] };
};

const refusal = (reason: string, message: string): CallToolResult => ({ isError: true, content: [{ type: 'text', text: `${reason}: ${message}` }] });

/** Reason and message of a failed call for the model; unexpected errors are not described (the log has them) */
function describeError(err: unknown): { reason: string; message: string } {
  if (err instanceof McpToolError || err instanceof LocalFileError) {
    return { reason: err.reason, message: err.message };
  }
  if (err instanceof TransferError) {
    return { reason: err.reason, message: [err.reason, ...err.details].join(' – ') };
  }
  if (err instanceof z.ZodError) {
    return { reason: 'BAD_INPUT', message: z.prettifyError(err) };
  }
  return { reason: 'INTERNAL_ERROR', message: 'The tool failed; the log of the app has details.' };
}

/** Runs one tool call: checks the permission of this moment, resolves the family tree, logs the call and records changes */
export async function callTool(tool: AnyTool, args: Record<string, unknown>, run: GqlRunner, config: McpConfig = readMcpConfig()): Promise<CallToolResult> {
  const started = Date.now();
  const changes = tool.level !== 'read';
  let treeId: string | null = null;
  let treeName: string | null = null;
  try {
    // The permissions may have been lowered since the client listed the tools
    if (!config.enabled || !toolAllowed(config.permissions, tool)) {
      throw new McpToolError('NOT_ALLOWED', `The user has not allowed "${tool.name}" (settings → MCP).`);
    }
    const library = run(null);
    const trees = () => accessibleTrees(library, config);
    const visible = await trees();
    const tree = tool.inTree ? pickTree(visible, args.familyTree as string | undefined) : defaultTree(visible);
    treeId = tree?.id ?? null;
    treeName = tree?.name ?? null;
    const context: ToolContext = {
      gql: run(treeId),
      tree: tool.inTree ? tree : null,
      can: (area, level) => allows(config.permissions, area, level),
      trees,
    };
    const parsed = z.object(tool.input).parse(args);
    const result = await tool.run(parsed, context);
    log.info('Tool call', { source: 'mcp', tool: tool.name, tree: treeId, ...idsOf(args), ms: Date.now() - started });
    if (changes) {
      addActivity({ tool: tool.name, tree: treeName, target: result.target ?? null, ok: true });
    }
    return answer(result.data);
  } catch (err) {
    const { reason, message } = describeError(err);
    if (reason === 'INTERNAL_ERROR') {
      log.error('Tool call failed', { source: 'mcp', tool: tool.name, tree: treeId, ...idsOf(args), err });
    } else {
      log.warn('Tool call refused', { source: 'mcp', tool: tool.name, tree: treeId, ...idsOf(args), reason });
    }
    if (changes) {
      addActivity({ tool: tool.name, tree: treeName, target: null, ok: false, reason });
    }
    return refusal(reason, message);
  }
}

const familyTreeParameter = z.string().max(200).optional().describe('Family tree (id or name); default: the one the app shows');

/**
 * An MCP server for one request (stateless): it lists only the tools the permissions of this moment allow, so the
 * model does not try the others. Each call is checked again (callTool).
 */
export function createMcpServer(config: McpConfig, run: GqlRunner, tools: AnyTool[] = ALL_TOOLS): McpServer {
  const server = new McpServer({ name: 'cognatio', title: 'Cognatio', version: appVersion() }, { instructions: INSTRUCTIONS });
  for (const tool of tools) {
    if (!toolAllowed(config.permissions, tool)) {
      continue;
    }
    const inputSchema = tool.inTree ? { ...tool.input, familyTree: familyTreeParameter } : tool.input;
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema,
        annotations: { readOnlyHint: tool.level === 'read', destructiveHint: tool.level === 'delete', openWorldHint: false },
      },
      (args: Record<string, unknown>) => callTool(tool, args, run),
    );
  }
  return server;
}
