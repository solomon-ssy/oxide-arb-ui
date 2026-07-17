import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      build: {
        manifest: true,
        // The operator console requires native BigInt for exact decimal controls.
        target: 'es2022',
      },
      server: {
        proxy: {
          '/ready': {
            changeOrigin: true,
            target: 'http://localhost:8088',
          },
          '/api': {
            changeOrigin: true,
            target: 'http://localhost:8088',
            ws: true,
          },
        },
      },
    },
  };
});
