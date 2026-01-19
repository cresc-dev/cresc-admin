import {
  AppstoreOutlined,
  FileTextOutlined,
  KeyOutlined,
  LineChartOutlined,
  PlusOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Card,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  message,
  Progress,
  Select,
  Tag,
  Tooltip,
} from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { PRICING_LINK } from '@/constants/links';
import { quotas } from '@/constants/quotas';
import { rootRouterPath } from '@/router';
import { api } from '@/services/api';
import { useAppList, useUserInfo } from '@/utils/hooks';
import { ReactComponent as LogoH } from '../assets/logo-h.svg';
import PlatformIcon from './platform-icon';

interface SiderMenuProps {
  selectedKeys: string[];
}

const style = {
  sider: { boxShadow: '2px 0 8px 0 rgb(29 35 41 / 5%)', zIndex: 2 },
};

function addApp() {
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
            placeholder="Please enter the app name"
            onChange={({ target }) => (name = target.value)}
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
              // {
              //   value: 'harmony',
              //   label: (
              //     <>
              //       <PlatformIcon platform="harmony" className="mr-[10px]" />
              //       HarmonyOS
              //     </>
              //   ),
              // },
            ]}
          />
        </Form.Item>
      </Form>
    ),
    onOk() {
      if (!name) {
        message.warning('Please enter the app name');
        return false;
      }
      return api.createApp({ name, platform }).catch((error) => {
        message.error((error as Error).message);
      });
    },
  });
}

export default function Sider() {
  const { pathname } = useLocation();
  const { user } = useUserInfo();
  if (!user) return null;

  const initPath = pathname?.replace(/^\//, '')?.split('/');
  let selectedKeys = initPath;
  if (selectedKeys?.length === 0) {
    if (pathname === '/') {
      selectedKeys = ['/user'];
    } else {
      selectedKeys = initPath;
    }
  }
  return (
    <Layout.Sider width={240} theme="light" style={style.sider}>
      <Layout.Header className="flex justify-center items-center bg-transparent! px-0!">
        <LogoH />
      </Layout.Header>
      <SiderMenu selectedKeys={selectedKeys} />
    </Layout.Sider>
  );
}

const SiderMenu = ({ selectedKeys }: SiderMenuProps) => {
  const { user, displayExpireDay } = useUserInfo();
  const { apps } = useAppList();
  const quota = user?.quota || quotas[user?.tier as keyof typeof quotas];
  const pvQuota = quota?.pv;
  const consumedQuota = user?.checkQuota;
  const percent =
    pvQuota && consumedQuota ? (consumedQuota / pvQuota) * 100 : undefined;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {percent && (
        <Card
          title={
            <div className="text-center py-1">
              <span className="">{user?.email}</span>
              <br />
              <span className="font-normal">Today's query balance</span>
            </div>
          }
          size="small"
          className="mr-2! mb-4!"
        >
          <Progress
            status={percent && percent > 40 ? 'normal' : 'exception'}
            size={['100%', 30]}
            percent={percent}
            percentPosition={{ type: 'inner', align: 'center' }}
            format={() =>
              consumedQuota ? `${consumedQuota.toLocaleString()}` : ''
            }
          />
          <div className="text-xs mt-2 text-center">
            7-day average balance: {user?.last7dAvg?.toLocaleString()}
          </div>
          <div className="text-xs mt-2 text-center">
            <a target="_blank" href={PRICING_LINK} rel="noreferrer">
              {quota?.title}
            </a>{' '}
            Available: {pvQuota?.toLocaleString()} per day
          </div>{' '}
          {user?.tier !== 'free' && (
            <div className="text-xs mt-2 text-center">
              Next billing date: {displayExpireDay}
            </div>
          )}
        </Card>
      )}
      <div className="overflow-y-auto">
        <Menu
          defaultOpenKeys={['apps']}
          selectedKeys={selectedKeys}
          mode="inline"
          items={[
            {
              key: 'user',
              icon: <UserOutlined />,
              label: <Link to={rootRouterPath.user}>Account Settings</Link>,
            },
            {
              key: 'api-tokens',
              icon: <KeyOutlined />,
              label: <Link to={rootRouterPath.apiTokens}>API Tokens</Link>,
            },
            {
              key: 'audit-logs',
              icon: <FileTextOutlined />,
              label: <Link to={rootRouterPath.auditLogs}>Audit Logs</Link>,
            },
            {
              key: 'realtime-metrics',
              icon: <LineChartOutlined />,
              label: (
                <Link to={rootRouterPath.realtimeMetrics}>Realtime Metrics</Link>
              ),
            },
            {
              key: 'apps',
              icon: <AppstoreOutlined />,
              label: 'Apps',
              children: [
                ...(apps?.map((i, index) => ({
                  key: `${i.id}-${index}`,
                  className: '!h-16',
                  label: (
                    <div className="flex flex-row items-center gap-4">
                      <div className="flex flex-col justify-center">
                        <PlatformIcon
                          platform={i.platform}
                          className="text-xl!"
                        />
                      </div>
                      <Link
                        to={`/apps/${i.id}`}
                        className="flex flex-col h-16 justify-center"
                      >
                        <div className="flex flex-row items-center font-bold">
                          {i.name}
                          {i.status === 'paused' && (
                            <Tag className="ml-2">Paused</Tag>
                          )}
                        </div>
                        {i.checkCount && (
                          <div className="text-xs text-gray-500 mb-2">
                            <Tooltip
                              mouseEnterDelay={1}
                              title="Today's check times for this app"
                            >
                              <a>{i.checkCount.toLocaleString()} times</a>
                            </Tooltip>
                          </div>
                        )}
                      </Link>
                    </div>
                  ),
                })) || []),
                {
                  key: 'add-app',
                  icon: <PlusOutlined />,
                  label: 'New App',
                  onClick: addApp,
                },
              ],
            },
            ...(user?.admin
              ? [
                  {
                    key: 'admin',
                    icon: <SettingOutlined />,
                    label: 'Admin',
                    children: [
                      {
                        key: 'admin-config',
                        label: (
                          <Link to={rootRouterPath.adminConfig}>Dynamic Config</Link>
                        ),
                      },
                      {
                        key: 'admin-users',
                        label: (
                          <Link to={rootRouterPath.adminUsers}>User Management</Link>
                        ),
                      },
                      {
                        key: 'admin-apps',
                        label: (
                          <Link to={rootRouterPath.adminApps}>App Management</Link>
                        ),
                      },
                      {
                        key: 'admin-metrics',
                        label: (
                          <Link to={rootRouterPath.adminMetrics}>Global Metrics</Link>
                        ),
                      },
                    ],
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
};
