import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@medxforce/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('/motion/') || id.includes('node_modules/motion')) return 'motion';
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api/visit-capture': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
