import { Checkbox, Input, Modal, QRCode } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEST_QR_CODE_DOC } from '@/constants/links';
import { safeStorage } from '@/utils/storage';
import { useManageContext } from '../hooks/useManageContext';

// Same key as in the ManageContext days, so deep links users already saved survive
const deepLinkStorageKey = (appId: number) => `${appId}_deeplink`;

export const TestQrCodeModal = ({
  open,
  onClose,
  name,
  hash,
}: {
  open: boolean;
  onClose: () => void;
  name?: string;
  hash: string;
}) => {
  const { t } = useTranslation();
  const { appId } = useManageContext();
  // Only this popover uses the deep link, so the state is local: each keystroke
  // re-renders just this row's QR code instead of the whole table through
  // ManageContext. Rows share it via localStorage, re-read when the popover opens.
  const [deepLink, setDeepLink] = useState(
    () => safeStorage.get(deepLinkStorageKey(appId)) ?? '',
  );
  const [enableDeepLink, setEnableDeepLink] = useState(!!deepLink);

  const isDeepLinkValid = enableDeepLink && deepLink.endsWith('://');

  useEffect(() => {
    if (open) {
      const stored = safeStorage.get(deepLinkStorageKey(appId));
      if (stored !== null) {
        setDeepLink(stored);
        setEnableDeepLink(!!stored);
      }
    }
  }, [open, appId]);

  useEffect(() => {
    if (isDeepLinkValid) {
      safeStorage.set(deepLinkStorageKey(appId), deepLink);
    }
  }, [appId, deepLink, isDeepLinkValid]);

  const codePayload = {
    type: '__rnPushyVersionHash',
    data: hash,
  };
  const codeValue = isDeepLinkValid
    ? `${deepLink}?${new URLSearchParams(codePayload).toString()}`
    : JSON.stringify(codePayload);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      maskClosable
      keyboard
      destroyOnClose
      footer={null}
      width={480}
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="font-semibold text-base text-[var(--ant-color-text)]">
            {t('version_table.qr_title')}
          </span>
          <a
            target="_blank"
            className="text-xs text-[var(--ant-color-primary)] hover:underline font-normal"
            href={TEST_QR_CODE_DOC}
            rel="noreferrer"
          >
            {t('version_table.how_to_use')}
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        <div className="p-3 bg-white rounded-lg shadow-sm border border-[var(--ant-color-border-secondary)]">
          <QRCode
            value={codeValue}
            color="#000000"
            bgColor="#ffffff"
            bordered={false}
            size={180}
          />
        </div>
        {name && (
          <div className="font-medium text-center text-sm text-[var(--ant-color-text)]">
            {name}
          </div>
        )}
        <div className="w-full space-y-3">
          <Input.TextArea
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={codeValue}
            className="font-mono text-xs"
          />
          <div className="flex flex-col gap-2 rounded bg-[var(--ant-color-fill-quaternary)] border border-[var(--ant-color-border-secondary)] p-3">
            <Checkbox
              checked={enableDeepLink}
              onChange={({ target }) => {
                setEnableDeepLink(target.checked);
              }}
            >
              <span className="text-sm font-medium text-[var(--ant-color-text)]">
                {t('version_table.use_deep_link')}
              </span>
            </Checkbox>
            <Input
              placeholder={t('version_table.deep_link_placeholder')}
              className="mt-1"
              value={deepLink}
              onChange={({ target }) => {
                setDeepLink(target.value);
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
