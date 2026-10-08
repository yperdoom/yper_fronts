import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'test' ? [vue()] : [vue(), vueDevTools(), {
    name: 'push-worker-dev-scope',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/src/push-sw.js')) res.setHeader('Service-Worker-Allowed', '/');
        next();
      });
    },
  }],
  build: {
    rollupOptions: {
      input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), 'push-sw': fileURLToPath(new URL('./src/push-sw.js', import.meta.url)) },
      output: { entryFileNames: chunk => chunk.name === 'push-sw' ? 'push-sw.js' : 'assets/[name]-[hash].js' },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
  },
  test: {
    environment: 'jsdom',
    coverage: {
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js'],
      thresholds: {
        lines: 85,
      },
    },
  },
}));
