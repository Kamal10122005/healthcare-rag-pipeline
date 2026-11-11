/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Optional dev-time proxy. Enable by setting VITE_USE_DEV_PROXY=true and
    // pointing VITE_API_BASE_URL at "/api" to avoid CORS during local work.
    proxy: process.env.VITE_USE_DEV_PROXY === 'true'
      ? {
          '/api': {
            target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api/, ''),
          },
        }
      : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
