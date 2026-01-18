import { CopyOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api } from '@/services/api';

const { Paragraph } = Typography;

function ApiTokensPage() {
  const queryClient = useQueryClient();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['apiTokens'],
    queryFn: api.listApiTokens,
  });

  const createMutation = useMutation({
    mutationFn: api.createApiToken,
    onSuccess: (result) => {
      if (result?.token) {
        setNewToken(result.token);
        setCreateModalVisible(false);
        message.success('API Token created successfully');
        queryClient.invalidateQueries({ queryKey: ['apiTokens'] });
        form.resetFields();
      }
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to create');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: api.revokeApiToken,
    onSuccess: () => {
      message.success('Token revoked');
      queryClient.invalidateQueries({ queryKey: ['apiTokens'] });
    },
    onError: (error: Error) => {
      message.error(error.message || 'Failed to revoke');
    },
  });

  const handleCreate = async (values: {
    name: string;
    permissions: string[];
    expiresIn?: number;
  }) => {
    const permissions = {
      read: values.permissions?.includes('read'),
      write: values.permissions?.includes('write'),
      delete: values.permissions?.includes('delete'),
    };
    const expiresAt = values.expiresIn
      ? dayjs().add(values.expiresIn, 'day').toISOString()
      : undefined;
    await createMutation.mutateAsync({
      name: values.name,
      permissions,
      expiresAt,
    });
  };

  const columns: ColumnsType<ApiToken> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ApiToken) => (
        <Space>
          <KeyOutlined />
          {name}
          {record.isRevoked && <Tag color="red">Revoked</Tag>}
          {record.isExpired && !record.isRevoked && (
            <Tag color="orange">Expired</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Token',
      dataIndex: 'tokenSuffix',
      key: 'tokenSuffix',
      render: (tokenSuffix: string) => (
        <span className="font-mono text-gray-500">****{tokenSuffix}</span>
      ),
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: ApiToken['permissions']) => (
        <Space>
          {permissions?.read && <Tag color="blue">Read</Tag>}
          {permissions?.write && <Tag color="green">Write</Tag>}
          {permissions?.delete && <Tag color="red">Delete</Tag>}
        </Space>
      ),
    },
    {
      title: 'Expires At',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (expiresAt: string | null) =>
        expiresAt ? dayjs(expiresAt).format('YYYY-MM-DD HH:mm') : 'Never',
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (lastUsedAt: string | null) =>
        lastUsedAt ? dayjs(lastUsedAt).format('YYYY-MM-DD HH:mm') : 'Never',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) =>
        dayjs(createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: ApiToken) => (
        <Popconfirm
          title="Confirm Revoke"
          description="This token will no longer be usable. Are you sure?"
          onConfirm={() => revokeMutation.mutate(record.id)}
          okText="Yes"
          cancelText="No"
          disabled={record.isRevoked}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.isRevoked}
          >
            Revoke
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="body">
      <Card
        title="API Token Management"
        extra={
          <Button
            type="primary"
            icon={<KeyOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Token
          </Button>
        }
      >
        <Paragraph type="secondary" className="mb-4">
          API Tokens can be used for CI/CD pipelines or automation scripts to call{' '}
          <a
            target="_blank"
            href="https://api.cresc.dev/docs"
            rel="noopener"
          >
            Cresc API
          </a>
          . Each user can have up to 10 active tokens.
        </Paragraph>
        <Table
          columns={columns}
          dataSource={data?.data}
          loading={isLoading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="Create API Token"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Token Name"
            name="name"
            rules={[{ required: true, message: 'Please enter token name' }]}
          >
            <Input placeholder="e.g., CI/CD Pipeline" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="Permissions"
            name="permissions"
            rules={[{ required: true, message: 'Please select at least one permission' }]}
          >
            <Checkbox.Group>
              <Space direction="vertical">
                <Checkbox value="read">
                  <b>Read</b> - View apps, versions, and packages
                </Checkbox>
                <Checkbox value="write">
                  <b>Write</b> - Create and update apps, publish versions, upload packages
                </Checkbox>
                <Checkbox value="delete">
                  <b>Delete</b> - Delete apps, versions, and packages
                </Checkbox>
                <div className="text-xs text-gray-500 mt-1">
                  Note: Write permission does not include read permission
                </div>
              </Space>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item label="Expiration" name="expiresIn" initialValue={180}>
            <Select
              options={[
                { value: 0, label: 'Never expires' },
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
                { value: 180, label: '180 days' },
                { value: 360, label: '360 days' },
              ]}
            />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending}
              block
            >
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Token Created Successfully"
        open={!!newToken}
        onOk={() => setNewToken(null)}
        onCancel={() => setNewToken(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="I've saved it"
      >
        <div className="my-4">
          <Paragraph type="warning" className="mb-2">
            ⚠️ Please copy and save this token now. You won't be able to see it again!
          </Paragraph>
          <Input.TextArea
            value={newToken || ''}
            readOnly
            autoSize={{ minRows: 2 }}
            className="font-mono"
          />
          <Button
            icon={<CopyOutlined />}
            className="mt-2"
            onClick={() => {
              if (newToken) {
                navigator.clipboard.writeText(newToken);
                message.success('Copied to clipboard');
              }
            }}
          >
            Copy Token
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export const Component = ApiTokensPage;
