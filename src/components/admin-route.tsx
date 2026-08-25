import { Spin } from 'antd';
import { Navigate, Outlet } from 'react-router-dom';
import { useUserInfo } from '@/utils/hooks';

/**
 * Gate for admin routes: the child routes load on demand through
 * react-router's own `lazy`, so this only holds a placeholder until the user
 * info is ready and redirects non-admins away.
 */
export function AdminRoute() {
  const { isLoading, user } = useUserInfo();

  if (isLoading || user === undefined) {
    return (
      <div className="page-section flex min-h-64 items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!user?.admin) {
    return <Navigate replace to="/apps" />;
  }

  return <Outlet />;
}
