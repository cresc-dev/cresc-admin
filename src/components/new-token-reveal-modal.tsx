import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Modal, message, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile, useModalWidth } from '@/utils/responsive';

const { Paragraph } = Typography;

export interface NewTokenRevealModalProps {
  /** Plaintext token; null closes the modal */
  token: string | null;
  onClose: () => void;
  /** Desktop width; full width on mobile */
  width: number;
  title: string;
  okText: string;
  warning: string;
  copyText: string;
  copiedText: string;
  /** Extra content after the copy button (e.g. an MCP client config sample) */
  children?: ReactNode;
}

/**
 * The "shown only once" token modal, shared by API key and MCP connection
 * creation. Callers translate the copy in their own namespace and pass it in
 * to avoid dynamically built i18n keys.
 */
export function NewTokenRevealModal({
  token,
  onClose,
  width,
  title,
  okText,
  warning,
  copyText,
  copiedText,
  children,
}: NewTokenRevealModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const modalWidth = useModalWidth(width);

  const copyToken = async () => {
    if (!token) {
      return;
    }
    // Clipboard writes can be refused (page unfocused, permissions, insecure context); only toast after success
    try {
      await navigator.clipboard.writeText(token);
      message.success(copiedText);
    } catch {
      message.error(t('common.copy_failed'));
    }
  };

  return (
    <Modal
      title={title}
      open={!!token}
      width={modalWidth}
      onOk={onClose}
      onCancel={onClose}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText={okText}
    >
      <div className="my-4">
        <Paragraph type="warning" className="mb-2">
          {warning}
        </Paragraph>
        <Input.TextArea
          value={token || ''}
          readOnly
          autoSize={{ minRows: 2 }}
          className="font-mono"
        />
        <Button
          icon={<CopyOutlined />}
          className="mt-2 w-full sm:w-auto"
          block={isMobile}
          onClick={copyToken}
        >
          {copyText}
        </Button>
        {children}
      </div>
    </Modal>
  );
}
