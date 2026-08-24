import { useQuery } from '@tanstack/react-query';
import { Layout, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { serverKeys } from '@/utils/query-keys';

// The console's version is stamped in at build time (see rsbuild.config.ts);
// the engine's is asked of /status at runtime.
const uiVersion = process.env.PUBLIC_UI_VERSION ?? 'dev';

export default () => {
  const { t } = useTranslation();
  // Neither version changes while the page is open, so fetch once and never
  // retry: this line is informational, not something to fight for.
  const { data: status } = useQuery({
    queryKey: serverKeys.status(),
    queryFn: api.serverStatus,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  // A build that ldflags never stamped reports "unknown" — that is not a
  // version, and printing it reads as a broken release pipeline.
  const engine =
    status?.version && status.version !== 'unknown' ? status.version : '';
  return (
    <Layout.Footer className="shrink-0 text-center">
      <Typography.Paragraph type="secondary">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary" className="text-xs">
        {engine ? `engine: ${engine} · ` : ''}
        {`ui: ${uiVersion}`}
      </Typography.Paragraph>
    </Layout.Footer>
  );
};
