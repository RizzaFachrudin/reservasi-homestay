import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (required for Docker)
    port: 5173,
    watch: {
      usePolling: true, // Enable polling for file changes in Docker
    },
    proxy: {
      '/api': {
        target: 'http://backend:5000', // Use Docker service name
        changeOrigin: true,
      },
    },
  },
});
