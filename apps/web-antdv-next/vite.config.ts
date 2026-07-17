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
          // Keep the browser Host (e.g. localhost:5999) so backend
          // same-origin checks for refresh/logout/WS succeed without
          // cors_allowed_origins. changeOrigin:true would rewrite Host
          // to :8088 and break Origin matching across the Vite proxy.
          '/ready': {
            changeOrigin: false,
            target: 'http://localhost:8088',
          },
          '/api': {
            changeOrigin: false,
            target: 'http://localhost:8088',
            ws: true,
          },
        },
      },
    },
  };
});
