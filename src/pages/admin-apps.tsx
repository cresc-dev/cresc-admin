import {
  CopyOutlined,
  EditOutlined,
  LineChartOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Grid,
  Input,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rootRouterPath } from '@/router';
import { adminApi } from '@/services/admin-api';
import { patchSearchParams } from '@/utils/helper';

const { Title } = Typography;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const Component = () => {
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminApp | null>(null);
  const [form] = Form.useForm();

  const searchQuery = searchParams.get('search')?.trim() ?? '';
  const currentPage = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = parsePositiveInt(
    searchParams.get('pageSize'),
    isMobile ? 10 : 20,
  );
  const [searchKeyword, setSearchKeyword] = useState(searchQuery);

  useEffect(() => {
    setSearchKeyword(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const trimmedKeyword = searchKeyword.trim();
    if (trimmedKeyword === searchQuery) {
      return;
    }

    const timer = window.setTimeout(() => {
      patchSearchParams(setSearchParams, {
        search: trimmedKeyword || undefined,
        page: '1',
      });
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchKeyword, searchQuery, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['adminApps', searchQuery],
    queryFn: () => adminApi.searchApps(searchQuery || undefined),
  });

  const total = data?.data.length ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (currentPage > maxPage) {
      patchSearchParams(setSearchParams, { page: String(maxPage) });
    }
  }, [currentPage, maxPage, setSearchParams]);

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
      };

      updateMutation.mutate({ id: editingApp.id, data: updateData });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const columns: ColumnsType<AdminApp> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      responsive: ['md'],
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
      width: 220,
      render: (key: string) => (
        <Space wrap size={[4, 8]}>
          <span className="font-mono text-xs break-all">{key}</span>
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
        <span
          className={
            platform === 'ios'
              ? 'text-blue-600'
              : platform === 'android'
                ? 'text-green-600'
                : 'text-orange-600'
          }
        >
          {platform}
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      responsive: ['lg'],
      width: 80,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      responsive: ['md'],
      width: 80,
      render: (status: string | null) => status || '-',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      width: 160,
      render: (date: string | undefined) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'Actions',
      key: 'action',
      width: isMobile ? 136 : 220,
      render: (_value, record) => (
        <Space size={[0, 0]} wrap>
          <Link to={rootRouterPath.versions(String(record.id))}>
            <Button type="link" icon={<LinkOutlined />}>
              Open
            </Button>
          </Link>
          <Link
            to={`${rootRouterPath.realtimeMetrics}?${new URLSearchParams({
              appKey: record.appKey,
            }).toString()}`}
          >
            <Button type="link" icon={<LineChartOutlined />}>
              Metrics
            </Button>
          </Link>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="m-0!">
              App Management
            </Title>
            <div className="text-sm text-gray-500">
              Search and pagination stay in the URL, so refresh and shareable
              links preserve the same view.
            </div>
          </div>
          <Input
            placeholder="Search by name or App Key"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            allowClear
            className="w-full md:w-72"
          />
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={data?.data || []}
            columns={columns}
            rowKey="id"
            size={isMobile ? 'small' : 'middle'}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              simple: isMobile,
              showQuickJumper: !isMobile,
              showSizeChanger: !isMobile,
              showTotal: isMobile ? undefined : (count) => `${count} apps`,
              onChange: (page, nextPageSize) => {
                patchSearchParams(setSearchParams, {
                  page: String(page),
                  pageSize: String(nextPageSize),
                });
              },
            }}
            scroll={{ x: 840 }}
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
        width={isMobile ? 'calc(100vw - 32px)' : 600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Space className="w-full" direction="vertical" size="middle">
            <Form.Item
              name="name"
              label="Name"
              className="mb-0!"
              rules={[{ required: true }]}
            >
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
            <Form.Item
              name="downloadUrl"
              label="Download URL"
              className="mb-0!"
            >
              <Input placeholder="App store link" />
            </Form.Item>
            <Form.Item name="status" label="Status" className="mb-0!">
              <Input placeholder="Custom status" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};
