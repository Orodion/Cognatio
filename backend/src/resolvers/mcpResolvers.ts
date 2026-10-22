import { GraphQLError } from 'graphql';
import { logger } from '../lib/logger.js';
import { serverPort } from '../lib/serverAddress.js';
import { activitiesAfter } from '../lib/mcp/activity.js';
import { disableMcp, enableMcp, readMcpConfig, renewMcpToken, setMcpExcludedTrees, setMcpPermissions, type McpConfig } from '../lib/mcp/config.js';
import { AREA_NAMES, MCP_AREAS, type McpArea } from '../lib/mcp/permissions.js';
import type { GraphQLContext } from '../lib/treeScope.js';

const log = logger.child({ component: 'mcp' });

/** The settings section "MCP" is the user's alone: an assistant must not grant itself rights */
function onlyTheApp(context: GraphQLContext) {
  if (context.source === 'mcp') {
    throw new GraphQLError('The settings for AI assistants cannot be read or changed through MCP.', {
      extensions: { code: 'FORBIDDEN', reason: 'MCP_SETTINGS_FORBIDDEN' },
    });
  }
}

/** The section as the settings page shows it */
export function mcpSettings(config: McpConfig = readMcpConfig()) {
  const port = serverPort();
  return {
    enabled: config.enabled,
    address: port ? `http://127.0.0.1:${port.port}/mcp` : null,
    portChanged: port?.changed ?? false,
    permissions: AREA_NAMES.map((area) => ({ area, level: config.permissions[area], levels: ['off', ...MCP_AREAS[area]] })),
    excludedTrees: config.excludedTrees,
  };
}

export const mcpResolvers = {
  Query: {
    mcpSettings: (_: unknown, __: unknown, context: GraphQLContext) => {
      onlyTheApp(context);
      return mcpSettings();
    },
    mcpActivity: (_: unknown, { after = 0 }: { after?: number }, context: GraphQLContext) => {
      onlyTheApp(context);
      return activitiesAfter(after);
    },
  },
  Mutation: {
    enableMcp: (_: unknown, __: unknown, context: GraphQLContext) => {
      onlyTheApp(context);
      const { config, token } = enableMcp();
      log.warn('AI assistants (MCP) switched on', { permissions: config.permissions });
      return { token, settings: mcpSettings(config) };
    },
    disableMcp: (_: unknown, __: unknown, context: GraphQLContext) => {
      onlyTheApp(context);
      log.warn('AI assistants (MCP) switched off');
      return mcpSettings(disableMcp());
    },
    renewMcpToken: (_: unknown, __: unknown, context: GraphQLContext) => {
      onlyTheApp(context);
      if (!readMcpConfig().enabled) {
        throw new GraphQLError('MCP is switched off.', { extensions: { code: 'BAD_USER_INPUT', reason: 'MCP_DISABLED' } });
      }
      const { config, token } = renewMcpToken();
      log.warn('MCP token replaced');
      return { token, settings: mcpSettings(config) };
    },
    setMcpPermissions: (_: unknown, { permissions }: { permissions: Array<{ area: string; level: string }> }, context: GraphQLContext) => {
      onlyTheApp(context);
      const current = readMcpConfig().permissions;
      const given = Object.fromEntries(permissions.filter((p) => (AREA_NAMES as string[]).includes(p.area)).map((p) => [p.area as McpArea, p.level]));
      const config = setMcpPermissions({ ...current, ...given });
      log.warn('MCP permissions changed', { permissions: config.permissions });
      return mcpSettings(config);
    },
    setMcpExcludedTrees: (_: unknown, { ids }: { ids: string[] }, context: GraphQLContext) => {
      onlyTheApp(context);
      const config = setMcpExcludedTrees(ids);
      log.warn('MCP family trees changed', { excludedTrees: config.excludedTrees.length });
      return mcpSettings(config);
    },
  },
};
