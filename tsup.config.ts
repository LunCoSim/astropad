import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['script.js'],
  outDir: 'dist',
  format: ['iife'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  platform: 'browser',
  target: 'es2020',
  env: {
    // Ensure browser-compatible versions of libraries are used
    BROWSER: 'true',
  },
});