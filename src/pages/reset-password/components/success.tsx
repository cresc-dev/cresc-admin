import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';
import { rootRouterPath } from '@/router';

export default function Success() {
  return (
    <Result
      status="success"
      title="Password updated successfully. Please log in again."
      extra={[
        <Link key="login" to={rootRouterPath.login} replace>
          <Button type="primary">Log in</Button>
        </Link>,
      ]}
    />
  );
}
