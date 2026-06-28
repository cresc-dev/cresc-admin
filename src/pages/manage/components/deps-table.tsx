import { JavaScriptOutlined } from '@ant-design/icons';
import { Button, Dropdown, Popover } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mode } from 'vanilla-jsoneditor';
import { useAllVersions } from '@/utils/hooks';
import { useManageContext } from '../hooks/useManageContext';
import { DepsDiff } from './deps-diff';
import JsonEditor from './json-editor';
export const DepsTable = ({
  deps,
  name,
}: {
  deps?: Record<string, string>;
  name?: string;
}) => {
  const { t } = useTranslation();
  const { packages, appId } = useManageContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { versions, isLoading: versionsLoading } = useAllVersions({
    appId,
    enabled: popoverOpen,
  });
  const [diffs, setDiffs] = useState<{
    oldDeps?: Record<string, string>;
    newDeps?: Record<string, string>;
    newName?: string;
  } | null>(null);
  return (
    <Popover
      className="ant-typography-edit"
      classNames={{ root: 'deps-popover' }}
      afterOpenChange={(visible) => {
        setPopoverOpen(visible);
        if (!visible) {
          setDiffs(null);
        }
      }}
      content={
        <div className="deps-popover-content">
          {deps ? (
            <>
              <div className="deps-popover-header">
                <div className="deps-popover-title">
                  <div>
                    {t('deps_table.js_deps_title')}
                    {!diffs && `(${name})`}
                  </div>
                  {diffs && (
                    <div className="font-normal">
                      <span>{diffs.newName}</span>
                      {` <-> ${name}`}
                    </div>
                  )}
                </div>
                <div className="deps-popover-actions">
                  {diffs ? (
                    <Button
                      onClick={() => {
                        setDiffs(null);
                      }}
                    >
                      {t('deps_table.back')}
                    </Button>
                  ) : (
                    <Dropdown.Button
                      menu={{
                        items: [
                          {
                            key: 'package',
                            type: 'group',
                            label: t('deps_table.native_packages'),
                            children: packages
                              .filter((p) => !!p.deps)
                              .map((p) => ({
                                key: `p_${p.id}`,
                                label: p.name,
                              })),
                          },
                          {
                            key: 'version',
                            type: 'group',
                            label: t('deps_table.ota_versions'),
                            children: versionsLoading
                              ? [
                                  {
                                    key: 'version_loading',
                                    label: t('deps_table.loading'),
                                    disabled: true,
                                  },
                                ]
                              : versions
                                  .filter((v) => !!v.deps)
                                  .map((v) => ({
                                    key: `v_${v.id}`,
                                    label: v.name,
                                  })),
                          },
                        ],
                        onClick: ({ key }) => {
                          if (!key.includes('_')) {
                            return;
                          }
                          const [type, id] = key.split('_');
                          if (type === 'p') {
                            const pkg = packages.find((p) => p.id === +id);
                            setDiffs({
                              oldDeps: pkg?.deps,
                              newDeps: deps,
                              newName: `Native Package ${pkg?.name}`,
                            });
                          } else {
                            const version = versions.find((v) => v.id === +id);
                            setDiffs({
                              oldDeps: version?.deps,
                              newDeps: deps,
                              newName: `OTA Version ${version?.name}`,
                            });
                          }
                        },
                      }}
                    >
                      {t('deps_table.compare')}
                    </Dropdown.Button>
                  )}
                </div>
              </div>
              <div className="deps-popover-body">
                {diffs ? (
                  <DepsDiff oldDeps={diffs.oldDeps} newDeps={diffs.newDeps} />
                ) : (
                  <JsonEditor
                    className="deps-popover-json"
                    content={{
                      json: Object.keys(deps)
                        .sort() // Sort the keys alphabetically
                        .reduce(
                          (obj, key) => {
                            obj[key] = deps[key]; // Rebuild the object with sorted keys
                            return obj;
                          },
                          {} as Record<string, string>,
                        ),
                    }}
                    mode={Mode.tree}
                    mainMenuBar={false}
                    statusBar={false}
                    readOnly
                  />
                )}
              </div>
              <div className="deps-popover-note">{t('deps_table.note')}</div>
            </>
          ) : (
            <div>
              <h4 className="font-bold">{t('deps_table.js_deps_heading')}</h4>
            </div>
          )}
        </div>
      }
    >
      <Button type="link" icon={<JavaScriptOutlined />} onClick={() => {}} />
    </Popover>
  );
};
