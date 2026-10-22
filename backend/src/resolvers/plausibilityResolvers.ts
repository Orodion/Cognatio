import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../lib/treeScope.js';
import { loadTreeIssues } from '../lib/plausibility/plausibility.js';

/** At most this many issues are kept as checked per family tree (keys of issues that are gone are dropped first) */
const MAX_CHECKED = 10_000;

export const plausibilityResolvers = {
  Query: {
    // Number of possible errors not marked as right (the number in the sidebar)
    openPlausibilityIssues: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) =>
      (await loadTreeIssues(prisma, await treeId())).filter((issue) => !issue.checked).length,

    // Possible errors of the active family tree with the persons concerned
    plausibilityIssues: async (_: unknown, __: unknown, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const issues = await loadTreeIssues(prisma, tree);
      const ids = [...new Set(issues.flatMap((i) => i.personIds))];
      const persons = new Map((await prisma.person.findMany({ where: { id: { in: ids } } })).map((p) => [p.id, p]));
      return issues.map(({ personIds, ...issue }) => ({ ...issue, persons: personIds.map((id) => persons.get(id)).filter(Boolean) }));
    },
  },

  Mutation: {
    // Marks a possible error as right or shows it again; keys of issues that no longer exist are dropped on the way
    checkPlausibilityIssue: async (_: unknown, { key, checked }: { key: string; checked: boolean }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const current = new Set((await loadTreeIssues(prisma, tree)).map((i) => i.key));
      if (checked && !current.has(key)) {
        throw new GraphQLError('This possible error does not exist (any more).', {
          extensions: { code: 'BAD_USER_INPUT', reason: 'ISSUE_NOT_FOUND' },
        });
      }
      const stored = await prisma.familyTree.findUnique({ where: { id: tree }, select: { checkedIssues: true } });
      const kept = (stored?.checkedIssues ?? []).filter((k) => k !== key && current.has(k));
      await prisma.familyTree.update({
        where: { id: tree },
        data: { checkedIssues: (checked ? [...kept, key] : kept).slice(-MAX_CHECKED) },
      });
      return true;
    },
  },
};
