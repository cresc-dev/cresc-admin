import { CopyOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { adminApi } from '@/services/admin-api';

const { Title } = Typography;

export const Component = () => {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminApp | null>(null);
  const [form] = Form.useForm();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminApps', debouncedSearch],
    queryFn: () => adminApi.searchApps(debouncedSearch || undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminApp> }) =>
      adminApi.updateApp(id, data),
    onSuccess: () => {
      message.success('App updated');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminApps'] });
    },
    onError: (error) => {
      message.error((error as Error).message);
    },
  });

  const handleEdit = (record: AdminApp) => {
    setEditingApp(record);
    form.setFieldsValue({
      name: record.name,
      appKey: record.appKey,
      platform: record.platform,
      userId: record.userId,
      downloadUrl: record.downloadUrl || '',
      status: record.status || '',
      ignoreBuildTime: record.ignoreBuildTime,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!editingApp) return;

      const updateData: Partial<AdminApp> = {
        name: values.name,
        appKey: values.appKey || undefined,
        platform: values.platform,
        userId: values.userId || null,
        downloadUrl: values.downloadUrl || null,
        status: values.status || null,
        ignoreBuildTime: values.ignoreBuildTime || null,
      };

      updateMutation.mutate({ id: editingApp.id, data: updateData });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns = [
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
      width: 150,
    },
    {
      title: 'App Key',
      dataIndex: 'appKey',
      key: 'appKey',
      width: 200,
      render: (key: string) => (
        <Space>
          <span className="font-mono text-xs">{key}</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(key);
              message.success('Copied');
            }}
          />
        </Space>
      ),
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 80,
      render: (platform: string) => (
        <span className={
          platform === 'ios' ? 'text-blue-600' :
          platform === 'android' ? 'text-green-600' : 'text-orange-600'
        }>
          {platform}
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string | null) => status || '-',
    },
    {
      title: 'Ignore Build Time',
      dataIndex: 'ignoreBuildTime',
      key: 'ignoreBuildTime',
      width: 120,
      render: (v: string | null) => (
        <span className={v === 'enabled' ? 'text-green-600' : ''}>
          {v === 'enabled' ? 'Yes' : v === 'disabled' ? 'No' : '-'}
        </span>
      ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_: unknown, record: AdminApp) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <Title level={4} className="m-0!">
            App Management
          </Title>
          <Input
            placeholder="Search by name or App Key"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            className="w-full md:w-72"
          />
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        title={`Edit App: ${editingApp?.name}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            Save
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item name="name" label="Name" className="mb-0!" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="appKey" label="App Key" className="mb-0!">
              <Input placeholder="Leave empty to keep current" />
            </Form.Item>
            <Form.Item name="platform" label="Platform" className="mb-0!">
              <Select
                options={[
                  { value: 'ios', label: 'iOS' },
                  { value: 'android', label: 'Android' },
                  { value: 'harmony', label: 'HarmonyOS' },
                ]}
              />
            </Form.Item>
            <Form.Item name="userId" label="User ID" className="mb-0!">
              <Input type="number" placeholder="Leave empty for no owner" />
            </Form.Item>
            <Form.Item name="downloadUrl" label="Download URL" className="mb-0!">
              <Input placeholder="App store link" />
            </Form.Item>
            <Form.Item name="status" label="Status" className="mb-0!">
              <Input placeholder="Custom status" />
            </Form.Item>
            <Form.Item name="ignoreBuildTime" label="Ignore Build Time" className="mb-0!">
              <Select
                allowClear
                options={[
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
