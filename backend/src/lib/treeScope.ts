import { GraphQLError } from 'graphql';
import type { PrismaClient } from '../generated/prisma/client.js';

/**
 * Several family trees: every request works in exactly one family tree. The frontend sends it in the header
 * `X-Family-Tree-Id` (downloads alternatively as `?familyTree=`); without one the oldest family tree applies.
 */
export const TREE_HEADER = 'x-family-tree-id';

type TreeDb = Pick<PrismaClient, 'familyTree'>;

/** Context of every resolver: database and the active family tree (determined only when needed) */
export interface GraphQLContext {
  prisma: PrismaClient;
  treeId: () => Promise<string>;
}

export const treeNotFound = () => new GraphQLError('Family tree does not exist.', { extensions: { code: 'NOT_FOUND', reason: 'TREE_NOT_FOUND' } });

export const isTreeNotFound = (err: unknown) => err instanceof GraphQLError && err.extensions.reason === 'TREE_NOT_FOUND';

/**
 * Active family tree: the requested one – it must exist and must not be in the recycle bin –, otherwise the
 * oldest. There may be none at all (empty database, all in the recycle bin): then TREE_NOT_FOUND, the app shows
 * its page "no family tree" and asks nothing that needs one. The backend never creates a family tree by itself.
 */
export async function resolveTree(db: TreeDb, requested?: string | null): Promise<string> {
  const tree = await db.familyTree.findFirst({
    where: { isDeleted: false, ...(requested ? { id: requested } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!tree) {
    throw treeNotFound();
  }
  return tree.id;
}

/**
 * Locks the row of a family tree until the end of the transaction `tx` (an update that changes nothing but its time).
 * An upload and a permanent deletion in the same family tree take this lock first and so run one after the other:
 * the deletion sees the file of an upload that came first, an upload after it finds its person gone. False if the
 * family tree does not exist (any more) or is not in the expected state (`deleted`: in the recycle bin).
 */
export async function lockTree(tx: Pick<PrismaClient, 'familyTree'>, id: string, deleted = false): Promise<boolean> {
  const { count } = await tx.familyTree.updateMany({ where: { id, isDeleted: deleted }, data: { isDeleted: deleted } });
  return count === 1;
}

/** Determines the family tree only on first access and then only once per request */
export function lazyTree(db: TreeDb, requested?: string | null): () => Promise<string> {
  let tree: Promise<string> | undefined;
  return () => (tree ??= resolveTree(db, requested));
}

/** Requested family tree of an HTTP request (header or query parameter) */
export function requestedTree(req: { get(name: string): string | undefined; query?: Record<string, unknown> }): string | null {
  const value = req.get(TREE_HEADER) ?? req.query?.familyTree;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const personNotFound = () => new GraphQLError('Person does not exist.', { extensions: { code: 'NOT_FOUND', reason: 'PERSON_NOT_FOUND' } });

/** Person of the active family tree – persons of other family trees count as not existing */
export async function personInTree(prisma: PrismaClient, treeId: string, id: string) {
  const person = await prisma.person.findFirst({ where: { id, familyTreeId: treeId } });
  if (!person) {
    throw personNotFound();
  }
  return person;
}
