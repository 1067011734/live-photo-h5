import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: ['es2020', 'safari14'] },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    restoreMocks: true,
    clearMocks: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
