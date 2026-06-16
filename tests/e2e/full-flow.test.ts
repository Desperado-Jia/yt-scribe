import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Miniflare } from 'miniflare'

describe('Full API Flow', () => {
  let mf: Miniflare

  beforeAll(async () => {
    // Build worker to JS first since Miniflare 4 needs JS
    const { execSync } = await import('child_process')
    execSync('node scripts/build-worker.mjs', { stdio: 'pipe' })

    mf = new Miniflare({
      modules: true,
      scriptPath: 'dist/worker.js',
      kvNamespaces: ['KV_STORE'],
      bindings: {
        GEMINI_API_KEY: 'test-key',
        DEMO_VIDEO_ID: 'xRh2sVcNXQ8',
        SKIP_YOUTUBE_FETCH: 'true',
        MAX_CHARS: '150000',
      },
      compatibilityFlags: ['nodejs_compat'],
    })
  })

  afterAll(async () => {
    await mf.dispose()
  })

  it('POST /create with invalid URL returns 400', async () => {
    const res = await mf.dispatchFetch('http://localhost/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-youtube-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET /session/:id returns 404 for unknown session', async () => {
    const res = await mf.dispatchFetch('http://localhost/session/nonexistent')
    expect(res.status).toBe(404)
  })

  it('OPTIONS returns CORS headers', async () => {
    const res = await mf.dispatchFetch('http://localhost/create', { method: 'OPTIONS' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
