import { gql } from '@apollo/client';

const SETTINGS_FIELDS = `
  enabled
  address
  portChanged
  permissions {
    area
    level
    levels
  }
  excludedTrees
`;

/** Settings section "MCP": AI assistants, their permissions and the family trees they see */
export const MCP_SETTINGS = gql`
  query McpSettings {
    mcpSettings {
      ${SETTINGS_FIELDS}
    }
  }
`;

/** Switches MCP on; the answer has the new token – the only time it is shown */
export const ENABLE_MCP = gql`
  mutation EnableMcp {
    enableMcp {
      token
      settings {
        ${SETTINGS_FIELDS}
      }
    }
  }
`;

export const DISABLE_MCP = gql`
  mutation DisableMcp {
    disableMcp {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const RENEW_MCP_TOKEN = gql`
  mutation RenewMcpToken {
    renewMcpToken {
      token
      settings {
        ${SETTINGS_FIELDS}
      }
    }
  }
`;

export const SET_MCP_PERMISSIONS = gql`
  mutation SetMcpPermissions($permissions: [McpPermissionInput!]!) {
    setMcpPermissions(permissions: $permissions) {
      ${SETTINGS_FIELDS}
    }
  }
`;

export const SET_MCP_EXCLUDED_TREES = gql`
  mutation SetMcpExcludedTrees($ids: [ID!]!) {
    setMcpExcludedTrees(ids: $ids) {
      ${SETTINGS_FIELDS}
    }
  }
`;

/** Changes of assistants after the entry `after` (page "Activity") */
export const MCP_ACTIVITY = gql`
  query McpActivity($after: Int!) {
    mcpActivity(after: $after) {
      last
      entries {
        seq
        at
        tool
        client
        tree
        target
        ok
        reason
      }
    }
  }
`;
