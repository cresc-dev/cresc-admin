import '@ant-design/v5-patch-for-react-19';
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
import { ThemeModeProvider, useThemeMode } from './utils/theme-mode';

const antdLocales: Record<string, typeof enUS> = {
  en: enUS,
  'zh-CN': zhCN,
};

const isLocalHost = () => {
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  );
};

const shouldEnablePwa = process.env.NODE_ENV === 'production' && !isLocalHost();

const hasServiceWorker = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

const clearLocalPwaState = () => {
  if (hasServiceWorker()) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((registration) => registration.unregister()),
        ),
      )
      .catch(() => {
        // SW cleanup failed, app continues normally.
      });
  }

  if (typeof caches !== 'undefined') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {
        // Cache cleanup failed, app continues normally.
      });
  }
};

if (hasServiceWorker() && shouldEnablePwa) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed, app continues normally
    });
  });
} else if (isLocalHost()) {
  window.addEventListener('load', clearLocalPwaState);
}

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
    <ConfigProvider locale={antdLocale} theme={theme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}
