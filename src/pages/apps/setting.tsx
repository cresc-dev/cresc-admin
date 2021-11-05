import { Form, message, Modal, Spin, Typography, Switch } from "antd";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import request, { RequestError } from "../../request";
import store from "../../store";
import { default as versionPageState } from "../versions/state";

const state = observable.object<{ app?: AppDetail }>({});

export default function (app: App) {
  if (app.id != state.app?.id) {
    state.app = undefined;
  }

  request("get", `app/${app.id}`).then((app) => {
    runInAction(() => (state.app = app));
  });

  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: <Content />,
    async onOk() {
      try {
        await request("put", `app/${app.id}`, state.app);
      } catch (error) {
        message.success((error as RequestError).message);
      }
      runInAction(() => {
        app.name = state.app!.name;
        versionPageState.app = state.app;
        Object.assign(
          store.apps.find((i) => i.id == app.id),
          state.app
        );
      });
      message.success("Updated");
    },
  });
}

const Content = observer(() => {
  const { app } = state;
  if (!app) return <Spin />;

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
      <Form.Item>
        <Switch
          checkedChildren="Resume"
          unCheckedChildren="Pause"
          checked={app.status !== "paused"}
          onChange={(checked) => runInAction(() => (app.status = checked ? "normal" : "paused"))}
        />
      </Form.Item>
    </Form>
  );
});

const style: Style = { item: { marginBottom: 0 } };
