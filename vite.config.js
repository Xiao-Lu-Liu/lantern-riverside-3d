import { defineConfig } from 'vite';

// Relative assets work on static hosts. Pages supplies its project base at build time.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
});
