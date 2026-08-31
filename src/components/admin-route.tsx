import { useQuery } from '@tanstack/react-query';
import { Button, Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import { hasSession } from '@/services/request';
import { userKeys } from '@/utils/query-keys';

/**
 * Gate admin routes while loading the current account, surface a retryable
 * error state, and redirect unauthenticated or non-admin users explicitly.
 */
export function AdminRoute() {
  const { t } = useTranslation();
  const sessionAvailable = hasSession();
  const {
    data: user,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: userKeys.info(),
    queryFn: api.me,
    enabled: sessionAvailable,
  });

  if (!sessionAvailable) {
    return <Navigate replace to={rootRouterPath.login} />;
  }

  if (isLoading || (!isError && user === undefined)) {
    return (
      <div className="page-section flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-section">
        <Result
          status="error"
          title={t('error_boundary.title')}
          subTitle={
            error instanceof Error && error.message
              ? error.message
              : t('error_boundary.unknown_error')
          }
          extra={
            <Button
              loading={isFetching}
              type="primary"
              onClick={() => void refetch()}
            >
              {t('error_boundary.retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (!user?.admin) {
    return <Navigate replace to={rootRouterPath.apps} />;
  }

  return <Outlet />;
}
