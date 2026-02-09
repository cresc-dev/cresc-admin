import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { JSONEditor, type Content, type OnChange } from 'vanilla-jsoneditor';
import { adminApi } from '@/services/admin-api';

const { Title } = Typography;

interface ConfigItem {
  key: string;
  value: string;
}

// JSON Editor wrapper component
const JsonEditorWrapper = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const handleChange: OnChange = (
        content: Content,
        _previousContent: Content,
        { contentErrors },
      ) => {
        if (!contentErrors) {
          if ('json' in content && content.json !== undefined) {
            onChange(JSON.stringify(content.json, null, 2));
          } else if ('text' in content) {
            onChange(content.text);
          }
        }
      };

      editorRef.current = new JSONEditor({
        target: containerRef.current,
        props: {
          content: { text: value },
          onChange: handleChange,
          mode: 'text',
        },
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.update({ text: value });
    }
  }, [value]);

  return <div ref={containerRef} style={{ height: 300 }} />;
};

export const Component = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [form] = Form.useForm();
  const [jsonValue, setJsonValue] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminConfig'],
    queryFn: () => adminApi.getConfig(),
  });

  const configList: ConfigItem[] = data?.data
    ? Object.entries(data.data).map(([key, value]) => ({ key, value }))
    : [];

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setJsonValue('');
    setIsModalOpen(true);
  };

  const handleEdit = (record: ConfigItem) => {
    setEditingItem(record);
    form.setFieldsValue({ key: record.key });
    // Pretty print JSON if possible
    try {
      setJsonValue(JSON.stringify(JSON.parse(record.value), null, 2));
    } catch {
      setJsonValue(record.value);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const key = values.key;

      // Try to parse as JSON for compact format, otherwise use raw string
      let valueToSave: string;
      try {
        const parsedValue = JSON.parse(jsonValue);
        valueToSave = JSON.stringify(parsedValue);
      } catch {
        // Not valid JSON, use raw string directly
        valueToSave = jsonValue;
      }

      await adminApi.setConfig(key, valueToSave);
      message.success('Saved successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminConfig'] });
    } catch (error) {
      message.error((error as Error).message);
    }
  };

  const handleDelete = useCallback(
    async (key: string) => {
      try {
        await adminApi.deleteConfig(key);
        message.success('Deleted');
        refetch();
      } catch (error) {
        message.error((error as Error).message);
      }
    },
    [refetch],
  );

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 200,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value: string) => {
        try {
          const parsed = JSON.parse(value);
          return (
            <pre className="m-0 max-h-24 overflow-auto text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          return <span className="text-gray-600">{value}</span>;
        }
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_: unknown, record: ConfigItem) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this config?"
            onConfirm={() => handleDelete(record.key)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-section">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <Title level={4} className="m-0!">
            Dynamic Configuration
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className="w-full md:w-auto"
          >
            Add Config
          </Button>
        </div>

        <Spin spinning={isLoading}>
          <Table
            dataSource={configList}
            columns={columns}
            rowKey="key"
            pagination={false}
            scroll={{ x: 720 }}
          />
        </Spin>
      </Card>

      <Modal
        title={editingItem ? 'Edit Config' : 'Add Config'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            Save
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="Key"
            rules={[{ required: true, message: 'Please enter config key' }]}
          >
            <Input disabled={!!editingItem} placeholder="Config key" />
          </Form.Item>
          <Form.Item label="Value">
            <JsonEditorWrapper value={jsonValue} onChange={setJsonValue} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
