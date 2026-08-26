import { Button, Form, type FormInstance, Input, Modal, Select } from 'antd';
import type { ReactNode } from 'react';
import type { AppOption } from '@/utils/app-options';
import { useModalWidth } from '@/utils/responsive';

export interface TokenCreateModalProps<Values> {
  open: boolean;
  onCancel: () => void;
  form: FormInstance<Values>;
  onFinish: (values: Values) => void;
  /** Desktop width; full width on mobile */
  width: number;
  title: string;
  loading: boolean;
  submitText: string;
  /** Name field copy: label / required message / placeholder */
  nameLabel: string;
  nameRequired: string;
  namePlaceholder: string;
  /** The remaining form items between the name field and the submit button */
  children: ReactNode;
}

/**
 * Skeleton of the create API key / MCP connection modal: name first, submit
 * button last. The permission/scope fields in between differ a lot, so each
 * page supplies them as children. The form is reset on close so the next open
 * does not carry stale input.
 */
export function TokenCreateModal<Values>({
  open,
  onCancel,
  form,
  onFinish,
  width,
  title,
  loading,
  submitText,
  nameLabel,
  nameRequired,
  namePlaceholder,
  children,
}: TokenCreateModalProps<Values>) {
  const modalWidth = useModalWidth(width);
  return (
    <Modal
      title={title}
      open={open}
      width={modalWidth}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label={nameLabel}
          name="name"
          rules={[{ required: true, message: nameRequired }]}
        >
          <Input placeholder={namePlaceholder} maxLength={100} />
        </Form.Item>
        {children}
        <Form.Item className="mb-0">
          <Button type="primary" htmlType="submit" loading={loading} block>
            {submitText}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export interface TokenAppsFormItemProps {
  label: string;
  extra: string;
  /** No selection means all apps; the placeholder says so */
  placeholder: string;
  options: AppOption[];
}

/** Restrict which apps the token may access (field name fixed to appIds, empty means unrestricted) */
export function TokenAppsFormItem({
  label,
  extra,
  placeholder,
  options,
}: TokenAppsFormItemProps) {
  return (
    <Form.Item label={label} name="appIds" extra={extra}>
      <Select
        mode="multiple"
        allowClear
        placeholder={placeholder}
        options={options}
      />
    </Form.Item>
  );
}
