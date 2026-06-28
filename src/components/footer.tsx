import { Layout, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

export default () => {
  const { t } = useTranslation();
  return (
    <Layout.Footer className="shrink-0 text-center">
      <Typography.Paragraph type="secondary">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </Typography.Paragraph>
    </Layout.Footer>
  );
};
