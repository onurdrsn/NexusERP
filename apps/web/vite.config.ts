// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },

  server: {
    port: 8888,
    proxy: {
      '/api/orders': {
        target: 'http://localhost:5173/.netlify/functions',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/orders/, '/sales-orders'),
      },
      '/api': {
        target: 'http://localhost:5173/.netlify/functions',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
})
