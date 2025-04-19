import { JavaScriptOutlined } from "@ant-design/icons";
import { Popover, Dropdown, Button } from "antd";
import JsonEditor from "./json-editor";
import { Mode } from "vanilla-jsoneditor";
import { useManageContext } from "../hooks/useManageContext";
import { useVersions } from "@/utils/hooks";
import { useState } from "react";
import { DepsDiff } from "./deps-diff";
export const DepsTable = ({
  deps,
  name,
}: {
  deps?: Record<string, string>;
  name?: string;
}) => {
  const { packages, appId } = useManageContext();
  const { versions } = useVersions({ appId, limit: 1000 });
  const [diffs, setDiffs] = useState<{
    oldDeps?: Record<string, string>;
    newDeps?: Record<string, string>;
    newName?: string;
  } | null>(null);
  return (
    <Popover
      className="ant-typography-edit"
      afterOpenChange={(visible) => {
        if (!visible) {
          setDiffs(null);
        }
      }}
      content={
        <div>
          <div className="text-center my-1 mx-auto">
            {deps ? (
              <div>
                <div className="flex flex-col items-center justify-center">
                  <h4>
                    JavaScript Dependencies{!diffs && `(${name})`}
                    <div>
                      {diffs && (
                        <>
                          <span className="font-normal">{diffs.newName}</span>
                          {` <-> ${name}`}
                        </>
                      )}
                    </div>
                    <div className="absolute right-4 top-7">
                      {diffs ? (
                        <Button
                          className="content-end"
                          onClick={() => {
                            setDiffs(null);
                          }}
                        >
                          Back
                        </Button>
                      ) : (
                        <Dropdown.Button
                          className=""
                          menu={{
                            items: [
                              {
                                key: "package",
                                type: "group",
                                label: "Native Packages",
                                children: packages
                                  .filter((p) => !!p.deps)
                                  .map((p) => ({
                                    key: `p_${p.id}`,
                                    label: p.name,
                                  })),
                              },
                              {
                                key: "version",
                                type: "group",
                                label: "OTA Versions",
                                children: versions
                                  .filter((v) => !!v.deps)
                                  .map((v) => ({
                                    key: `v_${v.id}`,
                                    label: v.name,
                                  })),
                              },
                            ],
                            onClick: ({ key }) => {
                              const [type, id] = key.split("_");
                              if (type === "p") {
                                const pkg = packages.find((p) => p.id === +id);
                                setDiffs({
                                  oldDeps: pkg?.deps,
                                  newDeps: deps,
                                  newName: "Native Package " + pkg?.name,
                                });
                              } else {
                                const version = versions.find(
                                  (v) => v.id === +id
                                );
                                setDiffs({
                                  oldDeps: version?.deps,
                                  newDeps: deps,
                                  newName: "OTA Version " + version?.name,
                                });
                              }
                            },
                          }}
                        >
                          Compare Changes
                        </Dropdown.Button>
                      )}
                    </div>
                  </h4>
                  {diffs ? (
                    <DepsDiff oldDeps={diffs.oldDeps} newDeps={diffs.newDeps} />
                  ) : (
                    <JsonEditor
                      content={{
                        json: Object.keys(deps)
                          .sort() // Sort the keys alphabetically
                          .reduce((obj, key) => {
                            obj[key] = deps[key]; // Rebuild the object with sorted keys
                            return obj;
                          }, {} as Record<string, string>),
                      }}
                      mode={Mode.tree}
                      mainMenuBar={false}
                      statusBar={false}
                      readOnly
                    />
                  )}

                  <div className="text-gray-500 my-4">
                    Note: Dependencies listed here are extracted directly from
                    `package.json` during the upload process. They might not
                    perfectly represent the final contents of the package.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="font-bold">JavaScript Dependencies</h4>
                <div className="text-gray-500">
                  Require cli v1.42.0+ version to upload to view the dependency
                  list
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <Button type="link" icon={<JavaScriptOutlined />} onClick={() => {}} />
    </Popover>
  );
};
