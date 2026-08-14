import type { SettlementRedeemView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  canAuthorizeSettlementCanary,
  isSettlementGovernedActionRevocable,
  settlementAuthorizationAction,
} from './settlement-action-state';

describe('settlement action state', () => {
  it('requires the exact pending digest before rendering approval', () => {
    expect(
      settlementAuthorizationAction({
        authorization_digest: '0x01',
        authorization_state: 'pending',
        effective_policy: 'automatic_eligible',
      } as SettlementRedeemView),
    ).toBe('approve');
    expect(
      settlementAuthorizationAction({
        authorization_digest: null,
        authorization_state: 'pending',
        effective_policy: 'automatic_eligible',
      } as SettlementRedeemView),
    ).toBeNull();
  });

  it('renders revocation only for an exact approved digest', () => {
    expect(
      settlementAuthorizationAction({
        authorization_digest: '0x02',
        authorization_state: 'approved',
        effective_policy: 'automatic_eligible',
      } as SettlementRedeemView),
    ).toBe('revoke');
    expect(
      settlementAuthorizationAction({
        authorization_digest: '0x02',
        authorization_state: 'consumed',
        effective_policy: 'automatic_eligible',
      } as SettlementRedeemView),
    ).toBeNull();
  });

  it('revokes governed actions only before a durable identity is dispatched', () => {
    expect(isSettlementGovernedActionRevocable('authorized')).toBe(true);
    expect(isSettlementGovernedActionRevocable('retry_scheduled')).toBe(true);
    expect(isSettlementGovernedActionRevocable('consumed')).toBe(false);
    expect(isSettlementGovernedActionRevocable('reconciliation_required')).toBe(
      false,
    );
  });

  it('offers a canary only with permission and an exact approved authorization', () => {
    const redeem = {
      authorization_digest: '0x03',
      authorization_state: 'approved',
      effective_policy: 'automatic_eligible',
    } as SettlementRedeemView;

    expect(canAuthorizeSettlementCanary(true, redeem, '1.25')).toBe(true);
    expect(canAuthorizeSettlementCanary(false, redeem, '1.25')).toBe(false);
    expect(canAuthorizeSettlementCanary(true, redeem, '   ')).toBe(false);
    expect(
      canAuthorizeSettlementCanary(
        true,
        {
          authorization_digest: null,
          authorization_state: 'approved',
          effective_policy: 'automatic_eligible',
        } as SettlementRedeemView,
        '1.25',
      ),
    ).toBe(false);
    expect(
      canAuthorizeSettlementCanary(
        true,
        {
          authorization_digest: '0x03',
          authorization_state: 'approved',
          effective_policy: 'manual_only',
        } as SettlementRedeemView,
        '1.25',
      ),
    ).toBe(false);
  });

  it('never approves manual-only inventory but still permits safe revocation', () => {
    expect(
      settlementAuthorizationAction({
        authorization_digest: '0x04',
        authorization_state: 'pending',
        effective_policy: 'manual_only',
      } as SettlementRedeemView),
    ).toBeNull();
    expect(
      settlementAuthorizationAction({
        authorization_digest: '0x04',
        authorization_state: 'approved',
        effective_policy: 'manual_only',
      } as SettlementRedeemView),
    ).toBe('revoke');
  });
});
