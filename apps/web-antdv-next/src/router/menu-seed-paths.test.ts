/**
 * Seed-path verifier (Phase 10.2).
 *
 * Every `component` in the backend menu seed (10.0 §3.1, frozen in
 * `crates/quant-pivot-models/src/seed/rbac/menus.rs` v8) must resolve to a
 * real view file through the same glob the router uses (`access.ts`) —
 * otherwise the dynamic route silently falls back to the 404 page after
 * login. Keep this list in lockstep with the backend seed: adding a menu
 * without its view (or deleting a view still referenced by the seed) must
 * fail here, not in production.
 */
import { describe, expect, it } from 'vitest';

const SEED_COMPONENTS = [
  'dashboard/index',
  'markets/index',
  'quant/reports/index',
  'quant/intents/index',
  'quant/execution-orders/index',
  'quant/positions/index',
  'quant/reconciliations/index',
  'quant/settlement-redeems/index',
  'quant/account/index',
  'research/workbench/index',
  'runtime-config/index',
  'users/index',
  'roles/index',
  'menus/index',
  'operation-log/index',
] as const;

const viewFiles = import.meta.glob('../views/**/*.vue');

describe('menu seed component paths', () => {
  it.each([...SEED_COMPONENTS])('resolves views/%s.vue', (component) => {
    expect(
      viewFiles[`../views/${component}.vue`],
      `backend menu seed references component "${component}" but views/${component}.vue does not exist — the route would 404 after login`,
    ).toBeDefined();
  });
});
