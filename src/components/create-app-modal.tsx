import { Form, Input, Modal, message, Select } from 'antd';
import { api } from '@/services/api';
import PlatformIcon from './platform-icon';

export const showCreateAppModal = ({
  onCreated,
}: {
  onCreated?: (id: number) => void | Promise<void>;
} = {}) => {
  let name = '';
  let platform = 'android';

  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label="App Name" name="name">
          <Input
            placeholder="Enter an app name"
            onChange={({ target }) => {
              name = target.value;
            }}
          />
        </Form.Item>
        <Form.Item label="Select Platform" name="platform">
          <Select
            onSelect={(value: string) => {
              platform = value;
            }}
            options={[
              {
                value: 'android',
                label: (
                  <>
                    <PlatformIcon platform="android" className="mr-2" /> Android
                  </>
                ),
              },
              {
                value: 'ios',
                label: (
                  <>
                    <PlatformIcon platform="ios" className="mr-2" /> iOS
                  </>
                ),
              },
            ]}
          />
        </Form.Item>
      </Form>
    ),
    async onOk() {
      const trimmedName = name.trim();
      if (!trimmedName) {
        message.warning('Please enter an app name');
        return false;
      }

      try {
        const id = await api.createApp({ name: trimmedName, platform });
        if (typeof id === 'number') {
          await onCreated?.(id);
        }
      } catch (error) {
        message.error((error as Error).message);
        return false;
      }
    },
  });
};
