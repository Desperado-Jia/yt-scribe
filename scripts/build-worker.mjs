import * as esbuild from 'esbuild'

// Step 1: Generate the hardcoded subtitle map from assets/*.vtt
await import('./generate-subtitle-map.mjs')

// Step 2: Build the worker
await esbuild.build({
  entryPoints: ['src/backend/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/worker.js',
  sourcemap: 'external',
  external: ['cloudflare:sockets'],
  loader: { '.vtt': 'text' },
})

console.log('Worker built to dist/worker.js')
