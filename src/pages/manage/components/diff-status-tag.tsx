import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useManageContext } from '../hooks/useManageContext';

const DONE_TAG_VISIBLE_MS = 5000;

// Inline patch-generation status for a version row: a spinning progress tag
// while generating; a persistent warning on failure (affected users fall back
// to full downloads, no retry offered); a success tag shown briefly only when
// the transition from generating happens within this session, so historical
// rows don't carry a permanent success badge.
const DiffStatusTag = ({ versionId }: { versionId: number }) => {
  const { t } = useTranslation();
  const { diffStatusByVersion } = useManageContext();
  const summary = diffStatusByVersion.get(versionId);
  const [showDone, setShowDone] = useState(false);
  const wasPendingRef = useRef(false);

  const pending = summary?.pending ?? 0;
  const failed = summary?.failed ?? 0;
  const hasSummary = !!summary;

  useEffect(() => {
    if (!hasSummary) {
      return;
    }
    if (pending > 0) {
      wasPendingRef.current = true;
      setShowDone(false);
      return;
    }
    if (wasPendingRef.current) {
      wasPendingRef.current = false;
      if (failed === 0) {
        setShowDone(true);
        const timer = setTimeout(() => {
          setShowDone(false);
        }, DONE_TAG_VISIBLE_MS);
        return () => clearTimeout(timer);
      }
    }
  }, [hasSummary, pending, failed]);

  if (!summary) {
    return null;
  }

  if (summary.pending > 0) {
    return (
      <Tooltip title={t('diff_status.generating_tip')}>
        <Tag color="processing" icon={<SyncOutlined spin />} className="m-0">
          {t('diff_status.generating', {
            done: summary.done + summary.failed,
            total: summary.total,
          })}
        </Tag>
      </Tooltip>
    );
  }

  if (summary.failed > 0) {
    return (
      <Tooltip title={t('diff_status.failed_tip')}>
        <Tag
          color="warning"
          icon={<ExclamationCircleOutlined />}
          className="m-0"
        >
          {t('diff_status.failed', { num: summary.failed })}
        </Tag>
      </Tooltip>
    );
  }

  if (showDone) {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />} className="m-0">
        {t('diff_status.done')}
      </Tag>
    );
  }

  return null;
};

export default DiffStatusTag;
