import { Modal, Typography } from 'antd';
import type { ReactNode } from 'react';

const NameList = ({ names }: { names: { id: number; name: string }[] }) => (
  <div className="max-h-48 overflow-y-auto">
    {names.map((item) => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
);

/**
 * Shared delete confirmation for versions and native packages: danger button,
 * closable via mask click or Esc. A string `names` is shown as is (single
 * item); a list renders as a scrollable name list (batch). `warning` shows as
 * a red paragraph above the names.
 */
export function confirmDelete({
  title,
  names,
  warning,
  onOk,
}: {
  title: ReactNode;
  names?: string | { id: number; name: string }[];
  warning?: ReactNode;
  onOk: () => Promise<unknown>;
}) {
  const warningNode = warning ? (
    <Typography.Paragraph type="danger">{warning}</Typography.Paragraph>
  ) : null;
  const namesNode = Array.isArray(names) ? <NameList names={names} /> : names;
  const content =
    warningNode && namesNode ? (
      <div>
        {warningNode}
        {namesNode}
      </div>
    ) : (
      (warningNode ?? namesNode)
    );

  Modal.confirm({
    title,
    content,
    maskClosable: true,
    keyboard: true,
    okButtonProps: { danger: true },
    async onOk() {
      await onOk();
    },
  });
}
