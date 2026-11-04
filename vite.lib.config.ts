import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: ['es2020', 'safari14'],
    outDir: 'lib',
    emptyOutDir: true,
    copyPublicDir: false,
    lib: {
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: () => 'live-photo.js',
      cssFileName: 'live-photo',
    },
    rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime'] },
  },
});
