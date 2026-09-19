import { useQueryClient } from '@tanstack/react-query';
import { Button, message, Select, Space } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { getBrowserTimezone, listTimezones } from '@/utils/timezone';

/**
 * The account's analytics time zone. Every console request already carries
 * the browser's zone, so this only matters for API clients and mail that
 * cannot say; it defaults to what the browser reported at registration.
 */
export function TimezoneSetting({ current }: { current?: string | null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const browserZone = getBrowserTimezone();
  const [value, setValue] = useState<string>(current ?? browserZone);
  const [saving, setSaving] = useState(false);
  const options = listTimezones().map((zone) => ({ value: zone, label: zone }));
  const dirty = value !== (current ?? '');

  const save = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ timezone: value });
      await queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      message.success(t('user.timezone_saved'));
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('user.timezone_failed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Space wrap>
        <Select
          showSearch
          style={{ minWidth: 240 }}
          value={value}
          options={options}
          onChange={setValue}
          optionFilterProp="label"
        />
        <Button
          type="primary"
          onClick={save}
          loading={saving}
          disabled={!dirty}
        >
          {t('user.timezone_save')}
        </Button>
      </Space>
      <span className="text-xs text-gray-500">
        {current
          ? t('user.timezone_hint', { browser: browserZone })
          : t('user.timezone_unset_hint', { browser: browserZone })}
      </span>
    </div>
  );
}
