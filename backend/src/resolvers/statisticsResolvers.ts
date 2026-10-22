import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../lib/treeScope.js';
import { loadStatisticsContext, loadStatisticsData } from '../lib/statistics/load.js';
import { StatisticsInputError, selectScope, type StatisticsScope } from '../lib/statistics/scope.js';
import { computeStatistics, personsOf } from '../lib/statistics/statistics.js';
import { ANCESTOR_FILTER_KINDS, ancestorCoverage, ancestorPersons, personWithMostAncestors } from '../lib/statistics/ancestors.js';

function inputError(err: unknown) {
  return err instanceof StatisticsInputError ? new GraphQLError(err.message, { extensions: { code: 'BAD_USER_INPUT', reason: err.reason } }) : err;
}

/** Runs a step that may refuse the scope or filter as BAD_USER_INPUT */
function checked<T>(step: () => T): T {
  try {
    return step();
  } catch (err) {
    throw inputError(err);
  }
}

interface TreeStatisticsArgs {
  scope?: StatisticsScope | null;
  language?: string | null;
  /** Start person of the ancestor figures (default: the person of an ancestor or descendant scope, the home person) */
  ancestorsOf?: string | null;
}

export const statisticsResolvers = {
  Query: {
    // Figures of the page "Statistics" for a scope of the active family tree; language: order of equally frequent names
    treeStatistics: async (_: unknown, { scope, language, ancestorsOf }: TreeStatisticsArgs, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const [{ persons, relations }, context] = await Promise.all([loadStatisticsData(prisma, tree), loadStatisticsContext(prisma, tree)]);
      const scoped = checked(() => selectScope(persons, relations, scope));
      const statistics = computeStatistics(scoped, relations, { language, everyone: persons, ...context }).statistics;

      // The ancestors are taken from the whole family tree, from the person asked for, the person of the scope or the home person
      const ids = new Set(persons.map((p) => p.id));
      if (ancestorsOf && !ids.has(ancestorsOf)) {
        throw inputError(new StatisticsInputError('PERSON_NOT_FOUND', 'The start person of the ancestors is not in this family tree.'));
      }
      const fromScope = scope?.kind === 'ANCESTORS' || scope?.kind === 'DESCENDANTS' ? scope.personId : null;
      const home = context.homePersonId && ids.has(context.homePersonId) ? context.homePersonId : null;
      const start = ancestorsOf ?? fromScope ?? home ?? personWithMostAncestors(persons, relations);
      const coverage = start ? ancestorCoverage(persons, relations, start) : null;
      return {
        ...statistics,
        ancestors: coverage && { ...coverage, person: persons.find((p) => p.id === start), isHomePerson: start === home, hasHomePerson: !!home },
      };
    },

    // The persons behind a figure of the statistics (filter as the figure names it, e.g. "surname:Kraft")
    statisticsPersons: async (_: unknown, { filter, scope }: { filter: string; scope?: StatisticsScope | null }, { prisma, treeId }: GraphQLContext) => {
      const tree = await treeId();
      const { persons, relations } = await loadStatisticsData(prisma, tree);
      const scoped = checked(() => selectScope(persons, relations, scope));
      // Ancestors come from the whole family tree; a scope only narrows them
      if (ANCESTOR_FILTER_KINDS.some((kind) => filter.startsWith(`${kind}:`))) {
        const inScope = new Set(scoped.map((p) => p.id));
        return checked(() => ancestorPersons(persons, relations, filter)).filter((p) => inScope.has(p.id));
      }
      const context = await loadStatisticsContext(prisma, tree);
      return checked(() => personsOf(scoped, computeStatistics(scoped, relations, { everyone: persons, ...context }).groups, filter));
    },
  },
};
