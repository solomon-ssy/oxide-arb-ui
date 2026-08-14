import { describe, expect, it } from 'vitest';

import {
  inspectorModule,
  WORKSPACE_INSPECTOR_REGISTRY,
} from './workspace-inspector-registry';

describe('workspace inspector registry', () => {
  it('gives every entity one owner and unique contextual modules', () => {
    for (const [path, registry] of Object.entries(
      WORKSPACE_INSPECTOR_REGISTRY,
    )) {
      for (const [entity, registration] of Object.entries(registry)) {
        const modules = [
          registration.canonicalModule,
          ...('contextualModules' in registration
            ? registration.contextualModules
            : []),
        ];
        expect({ entity, modules: new Set(modules).size, path }).toEqual({
          entity,
          modules: modules.length,
          path,
        });
      }
    }
  });

  it('keeps explicit process contexts and canonicalizes unsupported pairs', () => {
    expect(inspectorModule('/execution/orders', 'order-intent', 'flow')).toBe(
      'flow',
    );
    expect(inspectorModule('/execution/orders', 'order-intent', 'orders')).toBe(
      'intents',
    );
    expect(inspectorModule('/trading/recommendations', 'report', 'queue')).toBe(
      'queue',
    );
    expect(
      inspectorModule('/trading/recommendations', 'recommendation', 'diff'),
    ).toBe('queue');
  });

  it('rejects unknown entity identities', () => {
    expect(
      inspectorModule('/execution/orders', 'legacy-drawer'),
    ).toBeUndefined();
  });
});
