import '@ant-design/v5-patch-for-react-19';
import { StyleProvider } from '@ant-design/cssinjs';
import { theme as antdTheme, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './i18n';
// import { DndProvider } from "react-dnd";
// import { HTML5Backend } from "react-dnd-html5-backend";
import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from './router';
import { themeConfig } from './theme';
import { queryClient } from './utils/queryClient';
import { retireLegacyPwaState } from './utils/service-worker-retirement';
import { ThemeModeProvider, useThemeMode } from './utils/theme-mode';

const antdLocales: Record<string, typeof enUS> = {
  en: enUS,
  'zh-CN': zhCN,
};

window.addEventListener('load', () => {
  void retireLegacyPwaState();
});

const root = document.getElementById('main');
if (root) {
  createRoot(root).render(<App />);
}

function ThemedApp() {
  const { i18n } = useTranslation();
  const { isDark } = useThemeMode();
  const antdLocale = antdLocales[i18n.language] ?? enUS;
  const theme = useMemo(
    () => ({
      ...themeConfig,
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    }),
    [isDark],
  );

  return (
    // layer: antd styles go into @layer antd (below Tailwind utilities in the
    // order declared in index.css); otherwise cssinjs' unlayered styles would
    // override utility classes like mb-4
    <StyleProvider layer>
      <ConfigProvider locale={antdLocale} theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ConfigProvider>
    </StyleProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}
