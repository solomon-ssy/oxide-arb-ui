import { afterEach, describe, expect, it } from 'vitest';

import { preferencesManager, usePreferences } from '../src';

const position = usePreferences().preferencesButtonPosition;

afterEach(() => {
  preferencesManager.updatePreferences({
    app: {
      enablePreferences: true,
      isMobile: false,
      preferencesButtonPosition: 'auto',
    },
    header: { enable: true, hidden: false },
    sidebar: { hidden: false },
  });
});

describe('preferences button placement', () => {
  it('uses the user menu for auto placement on mobile', () => {
    preferencesManager.updatePreferences({
      app: {
        enablePreferences: true,
        isMobile: true,
        preferencesButtonPosition: 'auto',
      },
    });

    expect(position.value).toEqual({
      fixed: false,
      header: false,
      userDropdown: true,
    });
  });

  it('preserves explicit fixed placement on mobile', () => {
    preferencesManager.updatePreferences({
      app: {
        enablePreferences: true,
        isMobile: true,
        preferencesButtonPosition: 'fixed',
      },
    });

    expect(position.value).toEqual({
      fixed: true,
      header: false,
      userDropdown: false,
    });
  });

  it('keeps auto placement in the visible desktop header', () => {
    expect(position.value).toEqual({
      fixed: false,
      header: true,
      userDropdown: false,
    });
  });
});
