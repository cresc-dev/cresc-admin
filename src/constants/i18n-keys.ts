import type { ApiTokenScope, McpScope } from '@/constants/token-scopes';
import type { RangePresetKey } from '@/utils/charts';
import type { getFatalDepsViolation } from '@/utils/helper';
import type { ThemeMode } from '@/utils/theme-mode';

/**
 * Keys built dynamically as t(`a.b_${x}`) slip past the static check in
 * locales.test; spelling them out as literal lookup tables means a missing
 * translation shows up in the tests instead.
 */
export const MEMBER_ROLE_LABEL_KEY: Record<MemberRole, string> = {
  admin: 'members.role_admin',
  developer: 'members.role_developer',
  viewer: 'members.role_viewer',
};

export const MEMBER_ROLE_DESC_KEY: Record<MemberRole, string> = {
  admin: 'members.role_admin_desc',
  developer: 'members.role_developer_desc',
  viewer: 'members.role_viewer_desc',
};

export const THEME_MODE_LABEL_KEY: Record<ThemeMode, string> = {
  auto: 'nav.theme_auto',
  light: 'nav.theme_light',
  dark: 'nav.theme_dark',
};

export const QUOTA_ALERT_KIND_LABEL_KEY: Record<QuotaAlert['kind'], string> = {
  near_limit: 'user_analytics.quota_kind_near_limit',
  usage_drop: 'user_analytics.quota_kind_usage_drop',
  usage_spike: 'user_analytics.quota_kind_usage_spike',
};

// Range preset labels for the three metrics pages (different namespaces,
// slightly different wording); only the windows each page shows are listed,
// the order comes from getRangePresets
export const RANGE_PRESET_LABEL_KEY: Record<
  'realtime_metrics' | 'admin_metrics' | 'version_health',
  Partial<Record<RangePresetKey, string>>
> = {
  realtime_metrics: {
    '1h': 'realtime_metrics.range_1h',
    '6h': 'realtime_metrics.range_6h',
    '24h': 'realtime_metrics.range_24h',
    '7d': 'realtime_metrics.range_7d',
  },
  admin_metrics: {
    '1h': 'admin_metrics.range_1h',
    '6h': 'admin_metrics.range_6h',
    '24h': 'admin_metrics.range_24h',
    '7d': 'admin_metrics.range_7d',
    '30d': 'admin_metrics.range_30d',
  },
  version_health: {
    '24h': 'version_health.range_24h',
    '3d': 'version_health.range_3d',
    '7d': 'version_health.range_7d',
  },
};

/** Scope descriptions: the Record constraint makes a scope without copy a compile error */
export const API_TOKEN_SCOPE_DESC_KEY: Record<ApiTokenScope, string> = {
  'app:read': 'api_tokens.scope_app_read',
  'app:write': 'api_tokens.scope_app_write',
  'app:delete': 'api_tokens.scope_app_delete',
  'bundle:upload': 'api_tokens.scope_bundle_upload',
  'version:publish': 'api_tokens.scope_version_publish',
  'version:delete': 'api_tokens.scope_version_delete',
};

export const MCP_SCOPE_DESC_KEY: Record<McpScope, string> = {
  'pushy:apps:read': 'mcp.scope_pushy_apps_read',
  'pushy:diagnose': 'mcp.scope_pushy_diagnose',
};

/** Hard-rule violations of the publish preflight (non-null returns of getFatalDepsViolation). */
export const DEPS_VIOLATION_MESSAGE_KEY: Record<
  NonNullable<ReturnType<typeof getFatalDepsViolation>>,
  string
> = {
  rn_mismatch: 'bind_package.deps_rn_mismatch',
  rnu_downgrade: 'bind_package.deps_rnu_downgrade',
};
