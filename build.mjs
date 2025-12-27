#!/usr/bin/env node
import { build } from 'esbuild';
import { execSync } from 'child_process';

// Build frontend
console.log('Building frontend...');
execSync('npx vite build', { stdio: 'inherit' });

// Build backend with proper externalization
console.log('Building backend...');
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  external: [
    './vite.ts',
    './vite',
    '../vite.config.ts',
    '../vite.config',
    'vite',
    '@vitejs/plugin-react',
    '@replit/vite-plugin-*'
  ]
});

console.log('✓ Build complete');
