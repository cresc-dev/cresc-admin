import { Form, message, Modal, Spin, Typography, Switch, Button } from 'antd';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { DeleteFilled } from '@ant-design/icons';
import request, { RequestError } from '../../request';
import { removeApp } from './state';
import store from '../../store';

import { default as versionPageState } from '../versions/state';

const state = observable.object<{ app?: AppDetail }>({});

export default function setting(app: App) {
  if (app.id != state.app?.id) {
    state.app = undefined;
  }

  request('get', `app/${app.id}`).then((app) => {
    runInAction(() => {
      state.app = app;
    });
  });

  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: <Content />,
    async onOk() {
      try {
        await request('put', `app/${app.id}`, state.app);
      } catch (error) {
        message.error((error as RequestError).message);
        return;
      }

      runInAction(() => {
        if (state.app) {
          app.name = state.app.name;
          store.apps.find((i) => {
            if (i.id == app.id) {
              Object.assign(i, state.app);
            }
          });
          versionPageState.app = state.app;
        }
      });
      message.success("Updated");
    },
  });
}

const Content = observer(() => {
  const { app } = state;
  if (!app) return <Spin />;

  const { user } = store;
  return (
    <Form layout="vertical">
      <Form.Item label="App Name">
        <Typography.Paragraph
          type="secondary"
          style={style.item}
          editable={{ onChange: (value) => runInAction(() => (app.name = value)) }}
        >
          {app.name}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="App Key">
        <Typography.Paragraph style={style.item} type="secondary" copyable>
          {app.appKey}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label="Download Url">
        <Typography.Paragraph
          type="secondary"
          style={style.item}
          editable={{ onChange: (value) => runInAction(() => (app.downloadUrl = value)) }}
        >
          {app.downloadUrl ?? ""}
        </Typography.Paragraph>
      </Form.Item>
      <Form.Item label='启用热更新'>
        <Switch
          checkedChildren='启用'
          unCheckedChildren='暂停'
          checked={app.status !== 'paused'}
          onChange={(checked) => runInAction(() => (app.status = checked ? 'normal' : 'paused'))}
        />
      </Form.Item>
      <Form.Item label='忽略编译时间戳（高级版以上可启用）'>
        <Switch
          disabled={user?.tier !== 'premium' && user?.tier !== 'pro'}
          checkedChildren='启用'
          unCheckedChildren='不启用'
          checked={app.ignoreBuildTime === 'enabled'}
          onChange={(checked) =>
            runInAction(() => (app.ignoreBuildTime = checked ? 'enabled' : 'disabled'))
          }
        />
      </Form.Item>
      <Form.Item label='删除应用'>
        <Button type='primary' icon={<DeleteFilled />} onClick={() => removeApp(app)} danger>
          删除
        </Button>
      </Form.Item>
    </Form>
  );
});

const style: Style = { item: { marginBottom: 0 } };
