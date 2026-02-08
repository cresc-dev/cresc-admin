import { CreditCardOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, Descriptions, Dropdown, Space, Spin } from "antd";
import { type ReactNode, useState } from "react";
import { api } from "@/services/api";
import { useUserInfo } from "@/utils/hooks";
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
      className="mt-2 md:mt-0 md:ml-6"
      icon={<CreditCardOutlined />}
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

const UpgradeDropdown = ({
  currentQuota,
}: {
  currentQuota: (typeof quotas)[keyof typeof quotas];
}) => {
  const [loading, setLoading] = useState(false);

  // Get all upgradeable tiers
  const getUpgradeOptions = () => {
    const allTiers = [
      { key: "standard", title: "Upgrade to Standard", tier: "standard" },
      { key: "premium", title: "Upgrade to Premium", tier: "premium" },
      { key: "pro", title: "Upgrade to Pro", tier: "pro" },
      { key: "max", title: "Upgrade to Max", tier: "max" },
      { key: "ultra", title: "Upgrade to Ultra", tier: "ultra" },
    ];

    return allTiers.filter(
      (option) =>
        currentQuota.pv < quotas[option.tier as keyof typeof quotas].pv
    );
  };

  const upgradeOptions = getUpgradeOptions();

  if (upgradeOptions.length === 0) {
    return null; // No upgrade options available
  }

  const handleMenuClick: MenuProps["onClick"] = async ({ key }) => {
    setLoading(true);
    await purchase(key);
  };

  const menuItems: MenuProps["items"] = upgradeOptions.map((option) => ({
    key: option.tier,
    label: option.title,
    icon: <CreditCardOutlined />,
  }));

  const handleMainButtonClick = async () => {
    // Click main button to select the first upgrade option
    if (upgradeOptions.length > 0) {
      setLoading(true);
      await purchase(upgradeOptions[0].tier);
    }
  };

  return (
    <Dropdown.Button
      className="mt-2 md:mt-0 md:ml-6"
      icon={<CreditCardOutlined />}
      loading={loading}
      menu={{
        items: menuItems,
        onClick: handleMenuClick,
      }}
      onClick={handleMainButtonClick}
    >
      {loading ? "Preparing payment..." : upgradeOptions[0]?.title || "Upgrade"}
    </Dropdown.Button>
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
  const { name, email, tier, quota } = user;
  const defaultQuota = quotas[tier as keyof typeof quotas];
  const currentQuota = quota || defaultQuota;

  return (
    <div className="body">
      <Descriptions
        title="Account Information"
        column={1}
        styles={{ label: { width: 134 } }}
        bordered
      >
        <Descriptions.Item label="Username">{name}</Descriptions.Item>
        <Descriptions.Item label="Email">{email}</Descriptions.Item>
        <Descriptions.Item label="Subscription">
          <Space wrap>
            {currentQuota.title}
            {!quota && defaultQuota && (
              <UpgradeDropdown currentQuota={defaultQuota} />
            )}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Next billing date">
          <Space wrap>
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
            {tier !== "free" && (
              <PurchaseButton tier={tier}>Renew</PurchaseButton>
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
