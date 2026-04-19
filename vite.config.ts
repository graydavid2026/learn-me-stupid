import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../dist/client',
    // Split heavy deps into their own chunks so first-paint doesn't ship
    // the analytics charts + mind-map libs if the user only opens the
    // study view.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          reactflow: ['reactflow'],
          framer: ['framer-motion'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
