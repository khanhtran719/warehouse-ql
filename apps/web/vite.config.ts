import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: { environment: 'jsdom', globals: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
          if (id.includes('/@tanstack/')) return 'query-vendor';
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts-vendor';
          if (id.includes('/@ant-design/icons')) return 'icons-vendor';
          return undefined;
        },
      },
    },
  },
});
