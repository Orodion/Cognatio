import { GraphQLError } from 'graphql';
import { systemInfo } from '../lib/systemInfo.js';
import { LOG_LEVELS, logger, type LogLevel } from '../lib/logger.js';
import { writeAppSettings } from '../lib/files/appSettings.js';
import { MAX_LIMIT_MB, MIN_LIMIT_MB, currentLimits } from '../lib/transfer/limits.js';
import type { GraphQLContext } from '../lib/treeScope.js';

export const systemResolvers = {
  Query: {
    // State of the application for the settings page
    systemInfo: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => systemInfo(prisma),
    // Size limits of export, import and backup
    sizeLimits: () => currentLimits(),
  },
  Mutation: {
    // Changes the log level while the server is running; after a restart LOG_LEVEL applies again
    setLogLevel: (_: unknown, { level }: { level: string }) => {
      if (!LOG_LEVELS.includes(level as LogLevel)) {
        throw new GraphQLError(`Unknown log level: ${level}`, {
          extensions: { code: 'BAD_USER_INPUT', reason: 'LOG_LEVEL_INVALID' },
        });
      }
      // Logged before the switch, so it is still written if the new level would suppress it
      logger.child({ component: 'system' }).warn('Log level changed', { from: logger.level, to: level });
      logger.setLevel(level as LogLevel);
      return logger.level;
    },
    // Changes the optional upper limits of export/import and backup files; null removes a limit
    setSizeLimits: (_: unknown, { importMb = null, backupMb = null }: { importMb?: number | null; backupMb?: number | null }) => {
      for (const value of [importMb, backupMb]) {
        if (value !== null && (!Number.isInteger(value) || value < MIN_LIMIT_MB || value > MAX_LIMIT_MB)) {
          throw new GraphQLError(`Size limit must be between ${MIN_LIMIT_MB} and ${MAX_LIMIT_MB} MB: ${value}`, {
            extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_LIMIT' },
          });
        }
      }
      writeAppSettings({ limits: { importMb, backupMb } });
      logger.child({ component: 'system' }).warn('Size limits changed', { importMb, backupMb });
      return currentLimits();
    },
  },
};
