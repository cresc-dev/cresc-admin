import { api } from "@/services/api";
import { useUserInfo } from "@/utils/hooks";
import { AlipayCircleOutlined } from "@ant-design/icons";
import { Button, Descriptions, Popover, Space, Spin } from "antd";
import { type ReactNode, useState } from "react";
import { PRICING_LINK } from "../constants/links";
import { quotas } from "../constants/quotas";


const PurchaseButton = ({
  tier,
  children,
}: {
  tier: string;
  children: ReactNode;
}) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      // type='link'
      className="ml-6"
      icon={<AlipayCircleOutlined />}
      onClick={async () => {
        setLoading(true);
        await purchase(tier);
      }}
      loading={loading}
    >
      {loading ? "Preparing payment..." : children}
    </Button>
  );
};

function UserPanel() {
  const { user, displayExpireDay, displayRemainingDays } = useUserInfo();
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  const { name, email, tier } = user;
  const currentQuota = quotas[tier as keyof typeof quotas];
  return (
    <div className="body">
      <Descriptions
        title="Account Information"
        column={1}
        labelStyle={{ width: 134 }}
        bordered
      >
        <Descriptions.Item label="Username">{name}</Descriptions.Item>
        <Descriptions.Item label="Email">{email}</Descriptions.Item>
        <Descriptions.Item label="Subscription">
          <Space>
            {currentQuota.title}
            <span>
              {currentQuota.pv < quotas.standard.pv && (
                <PurchaseButton tier="standard">Upgrade to Standard</PurchaseButton>
              )}
              {currentQuota.pv < quotas.premium.pv && (
                <PurchaseButton tier="premium">Upgrade to Premium</PurchaseButton>
              )}
              {currentQuota.pv < quotas.pro.pv && (
                <PurchaseButton tier="pro">Upgrade to Pro</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip1.pv && (
                <PurchaseButton tier="vip1">Upgrade to VIP1</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip2.pv && (
                <PurchaseButton tier="vip2">Upgrade to VIP2</PurchaseButton>
              )}
              {currentQuota.pv < quotas.vip3.pv && (
                <PurchaseButton tier="vip3">Upgrade to VIP3</PurchaseButton>
              )}
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Subscription valid until">
          <Space>
            {displayExpireDay ? (
              <div className="flex flex-col">
                {displayExpireDay}
                {displayRemainingDays && (
                  <>
                    <br />
                    <div>{displayRemainingDays}</div>
                  </>
                )}
              </div>
            ) : (
              "N/A"
            )}
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button href={PRICING_LINK} target="_blank">
        View price list
      </Button>
    </div>
  );
}

async function purchase(tier?: string) {
  const orderResponse = await api.createOrder({ tier });
  if (orderResponse?.payUrl) {
    window.location.href = orderResponse.payUrl;
  }
}

export const Component = UserPanel;
