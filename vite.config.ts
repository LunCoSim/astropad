import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          blockchain: ['wagmi', 'viem', '@reown/appkit'],
          sdk: ['clanker-sdk'],
        },
      },
    },
    // Optimize for production
    minify: 'terser',
    sourcemap: false,
    target: 'esnext',
  },
  optimizeDeps: {
    include: ['clanker-sdk', 'wagmi', 'viem'],
  },
})