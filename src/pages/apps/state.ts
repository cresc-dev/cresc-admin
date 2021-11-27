import { Modal } from "antd";
import { observable, runInAction } from "mobx";
import request from "../../request";
import store, { fetchApps } from "../../store";

const state = observable.object({
  apps: observable.array<App>(),
  loading: false,
});

export default state;

export function fetch() {
  runInAction(() => (state.loading = true));
  request("get", "app/list").then(({ data }) =>
    runInAction(() => {
      state.apps = data;
      state.loading = false;
    })
  );
}

export async function getApp(id: number | string) {
  if (!state.apps.length) {
    const { data } = await request("get", "app/list");
    runInAction(() => (state.apps = data));
  }
  return state.apps.find((i) => i.id == id);
}

export async function removeApp(app: App) {
  Modal.confirm({
    title: "Are you sure?",
    content: 'Do you really want to delete the app record? It cannot be undone.',
    okText: "Delete",
    cancelText: 'Cancel',
    okButtonProps: { danger: true },
    async onOk() {
      await request("delete", `app/${app.id}`);
      fetchApps();
      store.history.replace("/apps");
    },
  });
}
