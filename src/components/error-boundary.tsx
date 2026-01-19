import { Button, Result } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';

interface ChunkError extends Error {
  __webpack_chunkName?: string;
}

export function ErrorBoundary() {
  const error = useRouteError() as ChunkError;
  const navigate = useNavigate();
  const message = error?.message || '';

  const isChunkError =
    message &&
    (message.includes('Loading CSS chunk') ||
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError'));

  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  const handleRetry = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Result
      status="500"
      title="Page Error"
      subTitle={message || 'An unknown error occurred'}
      extra={
        <>
          <Button type="primary" onClick={handleRetry}>
            Retry
          </Button>
          <Button onClick={handleGoHome}>Back to Home</Button>
        </>
      }
    />
  );
}
