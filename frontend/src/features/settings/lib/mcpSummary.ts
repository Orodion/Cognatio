import { useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { MCP_SETTINGS } from '@/features/settings/graphql/mcpQueries';
import { permissionSummary, type McpSettings } from '@/features/settings/lib/mcp';

/** One line of the summary of the section "MCP" ("read only", "everything allowed" …) */
export function useMcpSummary() {
  const { t } = useTranslation();
  const { data } = useQuery<{ mcpSettings: McpSettings }>(MCP_SETTINGS);
  return data ? t(`settings.mcp.summary.${permissionSummary(data.mcpSettings)}`) : undefined;
}
