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
