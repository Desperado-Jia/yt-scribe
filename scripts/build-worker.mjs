import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['src/backend/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/worker.js',
  sourcemap: 'external',
  external: ['cloudflare:sockets'],
})

console.log('Worker built to dist/worker.js')
