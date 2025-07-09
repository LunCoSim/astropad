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
          'clanker-v4': ['clanker-sdk/v4', 'clanker-sdk'],
        },
      },
    },
    // Optimize for production
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
    target: 'esnext',
    // Increase chunk size limit for better optimization
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['clanker-sdk', 'clanker-sdk/v4', 'wagmi', 'viem'],
    exclude: ['clanker-sdk/v3'], // Exclude v3 from optimization
  },
})