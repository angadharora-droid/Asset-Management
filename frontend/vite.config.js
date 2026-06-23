import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the frontend runs on :5173 and proxies any "/api" request
// to the Express backend on :5000, so the browser never hits a CORS wall and
// the API base URL can stay relative.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
