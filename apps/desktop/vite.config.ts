import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { defineConfig } from 'vite';

// Vite runs from apps/desktop, so resolve workspace sources relative to cwd.
const root = process.cwd();
const coreSrc = path.resolve(root, '../../packages/core/src');
const uiSrc = path.resolve(root, '../../packages/ui/src');

export default defineConfig({
  // Relative base so the built index.html loads assets over file:// in Electron.
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@planmark/core', replacement: coreSrc },
      { find: '@planmark/ui', replacement: uiSrc },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
