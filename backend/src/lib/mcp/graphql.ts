import type { ApolloServer } from '@apollo/server';
import { treeNotFound, type GraphQLContext } from '../treeScope.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { McpToolError, type Gql } from './tool.js';

/** Runs a GraphQL operation as an assistant: on the server of the app, in the given family tree, marked as MCP */
export type GqlRunner = (treeId: string | null) => Gql;

/**
 * Operations of tools run through the Apollo server of the app, so validation, family tree scope, cycle checks and the
 * recycle bin apply unchanged. An error of a resolver becomes a tool error with its reason (e.g. PERSON_NOT_FOUND).
 */
export function graphqlRunner(server: ApolloServer<GraphQLContext>, prisma: PrismaClient): GqlRunner {
  return (treeId) =>
    async <T>(query: string, variables?: Record<string, unknown>) => {
      const response = await server.executeOperation<Record<string, unknown>>(
        { query, variables },
        { contextValue: { prisma, treeId: () => (treeId ? Promise.resolve(treeId) : Promise.reject(treeNotFound())), source: 'mcp' } },
      );
      if (response.body.kind !== 'single') {
        throw new McpToolError('UNEXPECTED_RESPONSE', 'The server answered in an unexpected form.');
      }
      const { data, errors } = response.body.singleResult;
      if (errors?.length) {
        const [first] = errors;
        const reason = first.extensions?.reason ?? first.extensions?.code ?? 'ERROR';
        throw new McpToolError(String(reason), first.message);
      }
      return data as T;
    };
}
