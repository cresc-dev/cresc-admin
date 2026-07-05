import type { ThemeConfig } from 'antd';

/**
 * Brand primary color, kept in sync with the theme-color meta in index.html.
 * Note: #1677ff is also antd v5's default blue, so this only makes the value
 * explicit as the single source of truth. antd components consume it via
 * tokens; Tailwind consumes the emitted CSS variables (--ant-color-*) through
 * the @theme mapping in index.css.
 */
export const BRAND_PRIMARY = '#1677ff';

export const themeConfig: ThemeConfig = {
  // Enable CSS variable mode so antd outputs --ant-color-primary etc. for
  // Tailwind to reuse.
  cssVar: {},
  token: {
    colorPrimary: BRAND_PRIMARY,
  },
};
