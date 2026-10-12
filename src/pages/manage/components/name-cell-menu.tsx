import {
  DeleteOutlined,
  EditOutlined,
  JavaScriptOutlined,
  PullRequestOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type MenuItems = NonNullable<MenuProps['items']>;

/**
 * Hover menu of the name cell in the version table and the native package list:
 * name group header -> edit (needs publish permission) -> JS deps -> commit ->
 * extra -> delete (needs publish permission). Each side's own items (QR code,
 * fingerprint / build time) go in `extra`, after the commit item.
 */
export function buildNameCellMenu({
  name,
  canPublish,
  t,
  extra = [],
}: {
  name: string;
  canPublish: boolean;
  t: (key: string) => string;
  extra?: MenuItems;
}): MenuItems {
  return [
    {
      type: 'group',
      label: (
        <span className="font-semibold text-xs text-[var(--ant-color-text)] max-w-[240px] truncate block">
          {name}
        </span>
      ),
    },
    {
      type: 'divider',
    },
    ...(canPublish
      ? [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t('common.edit'),
          },
        ]
      : []),
    {
      key: 'deps',
      icon: <JavaScriptOutlined />,
      label: t('deps_table.js_deps_heading'),
    },
    {
      key: 'commit',
      icon: <PullRequestOutlined />,
      label: t('commit.title'),
    },
    ...extra,
    ...(canPublish
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: t('common.delete'),
            danger: true,
          },
        ]
      : []),
  ];
}
