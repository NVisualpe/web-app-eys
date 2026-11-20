import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, /api se redirige a la API Express local.
      '/api': 'http://localhost:3000',
    },
  },
});
