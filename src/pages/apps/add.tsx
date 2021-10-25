import { AndroidFilled, AppleFilled } from "@ant-design/icons";
import { Form, Input, message, Modal, Select } from "antd";
import request from "../../request";
import { fetchApps } from "../../store";

export default function () {
  let name = "";
  let platform = "android";
  Modal.confirm({
    icon: null,
    closable: true,
    maskClosable: true,
    content: (
      <Form initialValues={{ platform }}>
        <br />
        <Form.Item label="App Name" name="name">
          <Input placeholder="Please enter the app name" onChange={({ target }) => (name = target.value)} />
        </Form.Item>
        <Form.Item label="Platform" name="platform">
          <Select
            // @ts-ignore
            onSelect={(value) => (platform = value)}
          >
            <Select.Option value="android">
              <AndroidFilled style={style.android} /> Android
            </Select.Option>
            <Select.Option value="ios">
              <AppleFilled style={style.ios} /> iOS
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    ),
    onOk(_) {
      if (!name) {
        message.warn("Please enter the app name");
        return false;
      }
      return request("post", "app/create", { name, platform })
        .then(fetchApps)
        .catch((error) => {
          message.error(error.message);
        });
    },
  });
}

const style: Style = {
  ios: { color: "#a6b1b7" },
  android: { color: "#3ddc84" },
};
