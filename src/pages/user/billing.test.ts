import { describe, expect, it } from 'bun:test';
import { subscriptionControlState } from './billing';

describe('subscriptionControlState', () => {
  it('keeps controls visible for paid accounts while older servers omit status', () => {
    expect(
      subscriptionControlState({
        tier: 'standard',
        tierExpiresAt: '2026-09-15T10:04:20Z',
      }),
    ).toEqual({ canManage: true, pendingCancellation: false });
  });

  it('uses the server status to switch from cancel to resume', () => {
    expect(
      subscriptionControlState({
        tier: 'standard',
        tierExpiresAt: '2026-09-15T10:04:20Z',
        cancelAtPeriodEnd: true,
      }),
    ).toEqual({ canManage: true, pendingCancellation: true });
  });

  it('does not offer Stripe controls for free or custom accounts', () => {
    expect(subscriptionControlState({ tier: 'free' })).toEqual({
      canManage: false,
      pendingCancellation: false,
    });
    expect(
      subscriptionControlState({
        tier: 'custom',
        tierExpiresAt: '2026-09-15T10:04:20Z',
      }),
    ).toEqual({ canManage: false, pendingCancellation: false });
  });
});
