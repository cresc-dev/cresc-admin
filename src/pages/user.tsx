import { Button, Descriptions, Space, Popover } from "antd";
import { ReactNode, useState } from "react";
import request from "../request";
import store from "../store";

export default () => {
  const { name, email, tier, tierExpiresAt } = store.user!;
  return (
    <div className="body">
      <Descriptions title="Account" column={1} labelStyle={{ width: 134 }} bordered>
        <Descriptions.Item label="Username">{name}</Descriptions.Item>
        <Descriptions.Item label="Email">{email}</Descriptions.Item>
        <Descriptions.Item label="Subscription">
          <Space>
            {tiers[tier]}
            <span>
              {tier == "free" && <PurchaseButton tier="standard">Upgrade to Standard</PurchaseButton>}
              {(tier == "free" || tier == "standard") && (
                <PurchaseButton tier="premium">Upgrade to Premium</PurchaseButton>
              )}
              {tier != "pro" && <PurchaseButton tier="pro">Upgrade to Pro</PurchaseButton>}
            </span>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Expires">
          <Space>
            {tierExpiresAt ? new Date(tierExpiresAt).toLocaleDateString() : "N/A"}
            {tierExpiresAt && <PurchaseButton tier={tier}>Renew</PurchaseButton>}
          </Space>
        </Descriptions.Item>
      </Descriptions>
      <br />
      <Button type="primary" href="https://cresc.dev/pricing" target="_blank">
        See Pricing Plans
      </Button>
    </div>
  );
};

const PurchaseButton = ({ tier, children }: { tier: string; children: ReactNode }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="link"
      onClick={async () => {
        setLoading(true);
        await purchase(tier);
      }}
      loading={loading}
    >
      {loading ? "Check out" : children}
    </Button>
  );
};

async function purchase(tier?: string) {
  const { payUrl } = await request("post", "orders", { tier });
  location.href = payUrl;
}

const tiers = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
  pro: "Pro",
};
