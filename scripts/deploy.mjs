import { execSync } from 'child_process'

const env = process.argv[2] || 'production'

console.log(`Deploying to ${env}...`)

// Build worker
console.log('Building worker...')
execSync('node scripts/build-worker.mjs', { stdio: 'inherit' })

// Build frontend
console.log('Building frontend...')
execSync('npx vite build', { stdio: 'inherit' })

// Deploy worker
console.log('Deploying worker...')
const wranglerEnv = env === 'dev' ? '--env dev' : ''
execSync(`npx wrangler deploy ${wranglerEnv}`, { stdio: 'inherit' })

// Deploy pages
console.log('Deploying pages...')
execSync('npx wrangler pages deploy dist/frontend --project-name=yt-scribe', {
  stdio: 'inherit',
})

console.log('Deploy complete!')
