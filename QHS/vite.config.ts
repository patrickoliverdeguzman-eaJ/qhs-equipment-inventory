import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'

  return ({
  plugins: [react()],

  // Production assets live under Laravel's public/app directory. Development
  // stays rooted at / so React Router URLs remain natural.
  base: mode === 'production' ? '/app/' : '/',

  build: {
    outDir: '../public/app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts'],
          realtime: ['laravel-echo', 'pusher-js'],
        },
      },
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/broadcasting': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/storage': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
  })
})
