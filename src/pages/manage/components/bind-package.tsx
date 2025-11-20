import {
  CloudDownloadOutlined,
  ExperimentOutlined,
  LinkOutlined,
  RestOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import { useMemo } from 'react';
import { api } from '@/services/api';
import { useManageContext } from '../hooks/useManageContext';

const BindPackage = ({ versionId }: { versionId: number }) => {
  const {
    packages: allPackages,
    appId,
    bindings,
    packageMap,
  } = useManageContext();
  const availablePackages = allPackages;

  const bindedPackages = useMemo(() => {
    const result = [];
    const matchedBindings: {
      id?: number;
      packageId: number;
      rollout: number | null | undefined;
    }[] = bindings.filter((b) => b.versionId === versionId);

    if (matchedBindings.length === 0 || allPackages.length === 0) return null;

    for (const binding of matchedBindings) {
      const p = packageMap.get(binding.packageId);
      if (!p) {
        continue;
      }
      const rolloutConfig = binding.rollout;
      const isFull =
        rolloutConfig === 100 ||
        rolloutConfig === undefined ||
        rolloutConfig === null;
      const rolloutConfigNumber = Number(rolloutConfig);
      const items: MenuProps['items'] = isFull
        ? []
        : [
            {
              key: 'full',
              label: 'Full Release',
              icon: <CloudDownloadOutlined />,
              onClick: () =>
                api.upsertBinding({
                  appId,
                  packageId: binding.packageId,
                  versionId,
                }),
            },
          ];

      if (rolloutConfigNumber < 50 && !isFull) {
        items.push({
          key: 'staged',
          label: 'Staged Release',
          icon: <ExperimentOutlined />,
          children: [1, 2, 5, 10, 20, 50]
            .filter((percentage) => percentage > rolloutConfigNumber)
            .map((percentage) => ({
              key: `${percentage}`,
              label: `${percentage}%`,
              onClick: () =>
                api.upsertBinding({
                  appId,
                  packageId: binding.packageId,
                  versionId,
                  rollout: percentage,
                }),
            })),
        });
      }
      if (items.length > 0) {
        items.push({ type: 'divider' });
      }
      items.push({
        key: 'unpublish',
        label: 'Unpublish',
        icon: <RestOutlined />,
        onClick: () => {
          const bindingId = binding.id;
          if (bindingId) {
            api.deleteBinding({ appId, bindingId });
          } else {
            api.updatePackage({
              appId,
              packageId: p.id,
              params: { versionId: null },
            });
          }
        },
      });
      const button = (
        <Button
          size="small"
          color="primary"
          variant={isFull ? 'filled' : 'dashed'}
        >
          <span className="font-bold">{p.name}</span>
          <span className="text-xs">{isFull ? '' : `(${rolloutConfig}%)`}</span>
        </Button>
      );
      result.push(
        <Dropdown key={p.id} menu={{ items }}>
          {button}
        </Dropdown>,
      );
    }
    return result;
  }, [allPackages, bindings, versionId, appId, packageMap]);

  return (
    <div className="flex flex-wrap gap-1">
      {bindedPackages}
      {availablePackages.length !== 0 && (
        <Dropdown
          menu={{
            items: availablePackages.map((p) => ({
              key: p.id,
              label: p.name,
              children: [
                {
                  key: 'full',
                  label: 'Full Release',
                  icon: <CloudDownloadOutlined />,
                  onClick: () =>
                    api.upsertBinding({ appId, packageId: p.id, versionId }),
                },
                {
                  key: 'staged',
                  label: 'Staged Release',
                  icon: <ExperimentOutlined />,
                  children: [1, 2, 5, 10, 20, 50].map((percentage) => ({
                    key: `${percentage}`,
                    label: `${percentage}%`,
                    onClick: () =>
                      api.upsertBinding({
                        appId,
                        packageId: p.id,
                        versionId,
                        rollout: percentage,
                      }),
                  })),
                },
              ],
            })),
          }}
          className="ant-typography-edit"
        >
          <Button type="link" size="small" icon={<LinkOutlined />}>
            Publish
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default BindPackage;
