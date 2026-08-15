import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5MB limit
        },
        manifest: {
          name: "InvestMant App",
          short_name: "InvestMant",
          description: "Your ultimate investment and task tracking platform.",
          theme_color: "#0f172a",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ],
          share_target: {
            action: "/",
            method: "GET",
            params: {
              title: "title",
              text: "share_text",
              url: "url"
            }
          }
        },
        devOptions: {
          enabled: true,
          type: 'module'
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react') || id.includes('motion') || id.includes('react-hot-toast')) {
                return 'vendor-ui';
              }
              // Removed manual chunks for charts, pdf, and crypto to allow Vite to 
              // automatically code-split them into feature-specific lazy chunks.
            }
          }
        }
      }
    },
    server: {
      proxy: {
        '/api/binance': {
          target: 'https://api.binance.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/binance/, '')
        },
        '/api/ff_calendar': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/firestore_sync.json', '**/android/**']
      },
    },
  };
});
