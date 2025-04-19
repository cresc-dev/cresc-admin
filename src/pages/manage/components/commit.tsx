import { Popover, Button } from "antd";
import dayjs from "dayjs";
import gitUrlParse from "git-url-parse";
import { PullRequestOutlined } from "@ant-design/icons";

export const Commit = ({ commit }: { commit?: Commit }) => {
  if (!commit) {
    return (
      <Popover
        className="ant-typography-edit"
        content={
          <div>
            <div className="text-center my-1 mx-auto">
              <div className="font-bold">Recent Commit</div>
              <div className="text-gray-500">
                Require cli v1.42.0+ version to upload, and use git to manage
                code to view commit records
              </div>
            </div>
          </div>
        }
      >
        <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
      </Popover>
    );
  }

  const { origin, hash, message, author } = commit;
  let url = "";
  if (origin) {
    try {
      const { owner, name, source } = gitUrlParse(origin);
      url = `https://${source}/${owner}/${name}/commit/${hash}`;
    } catch (error) {
      console.error(error);
    }
  }

  const time = dayjs(+commit.timestamp * 1000);

  return (
    <Popover
      className="ant-typography-edit"
      content={
        <div>
          <div className="my-1 mx-auto">
            <div className="font-bold">Recent Commit</div>
            <div>Author: {author}</div>
            <div>
              Time: {time.fromNow()} ({time.format("YYYY-MM-DD HH:mm:ss")})
            </div>
            <div>Summary: {message}</div>
            <hr />
            {url ? (
              <a
                className="text-xs"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {hash}
              </a>
            ) : (
              <span className="text-xs">{hash}</span>
            )}
          </div>
        </div>
      }
    >
      <Button type="link" icon={<PullRequestOutlined />} onClick={() => {}} />
    </Popover>
  );
};
