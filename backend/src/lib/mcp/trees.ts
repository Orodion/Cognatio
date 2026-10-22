import type { McpConfig } from './config.js';
import { McpToolError, type Gql, type McpTree } from './tool.js';

/**
 * The family tree the app showed last (header of its requests): an assistant that names no family tree works in it,
 * like the user does. Kept in memory only; after a restart the oldest family tree applies until the app asks again.
 */
let appTree: string | null = null;

export function rememberAppTree(id: string | null) {
  if (id) {
    appTree = id;
  }
}

export interface ListedTree extends McpTree {
  description: string | null;
  personCount: number;
  createdAt: string;
  homePerson?: { id: string; title?: string | null; firstName: string; middleName?: string | null; lastName?: string | null; birthName?: string | null } | null;
}

/** The family trees an assistant sees: all outside the recycle bin, minus those excluded in the settings */
export async function accessibleTrees(gql: Gql, config: McpConfig): Promise<ListedTree[]> {
  const { familyTrees } = await gql<{ familyTrees: ListedTree[] }>(
    'query { familyTrees { id name description personCount createdAt homePerson { id title firstName middleName lastName birthName } } }',
  );
  return familyTrees.filter((tree) => !config.excludedTrees.includes(tree.id));
}

/** The family tree used when a tool names none: the one of the app if visible, otherwise the oldest visible one (as in the app) */
export function defaultTree<T extends McpTree & { createdAt?: string }>(trees: T[]): T | null {
  const oldest = [...trees].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0];
  return trees.find((tree) => tree.id === appTree) ?? oldest ?? null;
}

/** The family tree a tool call names (id or name, case does not matter), or the default one */
export function pickTree<T extends McpTree>(trees: T[], ref: string | null | undefined): T {
  const wanted = ref?.trim();
  if (!wanted) {
    const tree = defaultTree(trees);
    if (!tree) {
      throw new McpToolError('TREE_NOT_FOUND', 'There is no family tree the assistant may use.');
    }
    return tree;
  }
  const byId = trees.find((t) => t.id === wanted);
  if (byId) {
    return byId;
  }
  const named = trees.filter((t) => sameName(t.name, wanted));
  if (named.length > 1) {
    const ids = named.map((t) => t.id).join(', ');
    throw new McpToolError('TREE_AMBIGUOUS', `There are ${named.length} family trees named "${wanted}". Name one by its id: ${ids}.`);
  }
  const tree = named[0];
  if (!tree) {
    const names = trees.map((t) => `"${t.name}"`).join(', ');
    throw new McpToolError('TREE_NOT_FOUND', `No family tree "${wanted}". Available: ${names || 'none'}.`);
  }
  return tree;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Refuses a name another family tree already has (also one hidden from assistants), so names stay unambiguous */
export async function ensureFreeTreeName(gql: Gql, name: string, ownId?: string) {
  const { familyTrees } = await gql<{ familyTrees: McpTree[] }>('query { familyTrees { id name } }');
  if (familyTrees.some((tree) => tree.id !== ownId && sameName(tree.name, name))) {
    throw new McpToolError('TREE_NAME_TAKEN', `A family tree named "${name.trim()}" already exists. Choose another name.`);
  }
}
