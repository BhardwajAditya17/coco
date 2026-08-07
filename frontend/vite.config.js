import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002', // Your Express server's address
        changeOrigin: true,
      },
      '/uploads': 'http://localhost:5002',
    },
  },
});