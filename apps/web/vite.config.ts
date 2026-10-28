import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin in development too: the browser talks to Vite, Vite forwards /api to Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
