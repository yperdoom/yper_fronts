import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

export default defineConfig(({ mode }) => ({
  plugins: mode === 'test' ? [vue()] : [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
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
