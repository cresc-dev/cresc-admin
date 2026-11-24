import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { describeDiffFailure } from '@/utils/diff-status';
import { useManageContext } from '../hooks/useManageContext';

const DONE_TAG_VISIBLE_MS = 5000;
// A version may be bound to many native packages; list at most this many in the tooltip
const MAX_FAILURE_LINES = 8;

// Failure tooltip: the original explanation plus each failed native package's
// reason. When no failed entry carries a failure field (older server / older
// data) only the original explanation is shown.
const FailedTip = ({ failures }: { failures: VersionDiffFailureItem[] }) => {
  const { t } = useTranslation();
  const { packageMap } = useManageContext();
  const hasReason = failures.some((item) => item.failure);
  const shown = failures.slice(0, MAX_FAILURE_LINES);
  const hidden = failures.length - shown.length;

  return (
    <div>
      <div>{t('diff_status.failed_tip')}</div>
      {hasReason && (
        <ul className="m-0 mt-1 list-disc pl-4">
          {shown.map(({ packageId, failure }) => {
            const { key, params } = describeDiffFailure(failure);
            const name =
              packageMap.get(packageId)?.name ??
              t('diff_status.failed_reason_package_fallback', {
                id: packageId,
              });
            return (
              <li key={packageId}>
                {t('diff_status.failed_reason_item', {
                  name,
                  reason: t(key, params),
                })}
                {failure?.detail && (
                  <div className="line-clamp-3 text-xs break-all opacity-70">
                    {failure.detail}
                  </div>
                )}
              </li>
            );
          })}
          {hidden > 0 && (
            <li>{t('diff_status.failed_reason_more', { num: hidden })}</li>
          )}
        </ul>
      )}
    </div>
  );
};

// Inline patch-generation status for a version row: a spinning progress tag
// while generating; a persistent warning on failure that lists the reasons (it
// affects users on that native package who have not applied any OTA update
// yet — clients that report buildTime fall back to the full bundle, the rest
// never receive this release; no retry offered); a success tag shown briefly
// only when the transition from generating happens within this session, so
// historical rows don't carry a permanent success badge.
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
      <Tooltip
        title={<FailedTip failures={summary.failures} />}
        // Widen only when reasons are listed so they don't wrap into a narrow
        // column; keep the default width otherwise
        styles={
          summary.failures.some((item) => item.failure)
            ? {
                root: { maxWidth: 'min(420px, 90vw)' },
                container: { maxHeight: '60vh', overflowY: 'auto' },
              }
            : undefined
        }
      >
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
