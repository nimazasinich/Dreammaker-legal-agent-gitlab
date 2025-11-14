import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom']
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    proxy: {
      '^/api($|/)': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/market': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/signals': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/analysis': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/proxy': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/status': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '/binance': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      '^/ws($|/)': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      external: [
        'path',
        'fs',
        'fs/promises',
        'crypto',
        'os',
        'net',
        'tls',
        'dns',
        'stream',
        'util',
        'events',
        'assert',
        'url',
        'better-sqlite3',
        'ioredis'
      ],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: true,
  }
});
