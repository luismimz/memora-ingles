import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Memora — Inglés en 30 días',
        short_name: 'Memora',
        description: '100 palabras al día con asociaciones absurdas y repetición espaciada',
        theme_color: '#6d28d9',
        background_color: '#0f0d17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          { urlPattern: /\/api\/assets\//, handler: 'CacheFirst', options: { cacheName: 'assets', expiration: { maxEntries: 500 } } },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: { '/api': { target: 'http://localhost:8055', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } },
    fs: { allow: ['..'] },
  },
  test: { environment: 'node' },
});
