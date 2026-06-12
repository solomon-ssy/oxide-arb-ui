import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description Project configuration
 * The project needs to configure overrides here
 * The overrides are automatically deep-merged in `@vben/preferences`
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    accessMode: 'backend',
    defaultHomePath: '/dashboard',
    dynamicTitle: true,
    enableRefreshToken: true,
    loginExpiredMode: 'modal',
  },
  copyright: {
    companyName: 'Oxide Arb',
    companySiteLink: '',
    date: '2026',
    enable: true,
    settingShow: true,
  },
  logo: {
    enable: true,
    fit: 'contain',
    source: '/static/logo.png',
  },
});
