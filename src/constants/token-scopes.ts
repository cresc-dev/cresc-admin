// Mirrors the server's TOKEN_ALLOWED_SCOPES
export const API_TOKEN_SCOPES = [
  'app:read',
  'app:write',
  'app:delete',
  'bundle:upload',
  'version:publish',
  'version:delete',
] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

// Only the scopes backed by a shipped tool. The server's ALL_MCP_SCOPES is
// wider; add entries here as new tools land.
export const MCP_SCOPES = ['pushy:apps:read', 'pushy:diagnose'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];
