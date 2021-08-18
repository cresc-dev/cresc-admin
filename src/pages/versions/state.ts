import { observable, runInAction } from "mobx";
import { TablePaginationConfig } from "antd/lib/table";
import request from "../../request";
import { getApp } from "../apps/state";

const initState = {
  id: "",
  loading: false,
  packages: observable.array<Package>(),
  versions: observable.array<Version>(),
  unused: observable.array<Package>(),
};

type State = typeof initState & { app?: App; pagination: TablePaginationConfig };

const state = observable.object<State>({
  ...initState,
  pagination: {
    pageSize: 10,
    onChange(page, size) {
      if (size) {
        state.pagination.pageSize = size;
      }
      fetchVersions(page);
    },
  },
});

export default state;

export function fetch(id: string) {
  if (state.id == id) return;

  runInAction(() => {
    state.id = id;
    state.packages.clear();
    state.versions.clear();
  });
  getApp(id).then((app) => runInAction(() => (state.app = app)));
  request("get", `app/${id}/package/list?limit=1000`).then(({ data }) =>
    runInAction(() => (state.packages = data))
  );
  request("get", `app/${id}/package/list?limit=1000&noVersion=1`).then(({ data }) =>
    runInAction(() => (state.unused = data))
  );
  fetchVersions();
}

export function fetchVersions(page = 0) {
  if (page == 0) {
    if (state.versions.length) return;
    else page = 1;
  }

  runInAction(() => {
    state.loading = true;
    state.pagination.current = page;
  });
  const { pageSize } = state.pagination;
  const params = `offset=${(page - 1) * pageSize!}&limit=${pageSize}`;
  request("get", `app/${state.id}/version/list?${params}`).then(({ data, count }: any) => {
    runInAction(() => {
      state.pagination.total = count;
      state.versions = data;
      state.loading = false;
    });
  });
}
