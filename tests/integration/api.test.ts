import { describe, it, expect, vi } from 'vitest'

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}))

// Test helper to create a minimal env for testing
function createTestEnv(overrides: Record<string, string> = {}): any {
  const kv = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
  }

  return {
    KV_STORE: kv,
    GEMINI_API_KEY: 'test-key',
    DEMO_VIDEO_ID: 'xRh2sVcNXQ8',
    SKIP_YOUTUBE_FETCH: 'true',
    ...overrides,
  }
}

describe('Worker API', () => {
  it('POST /create returns 400 for invalid URL', async () => {
    const worker = await import('../../src/backend/index')
    const env = createTestEnv()

    const request = new Request('https://example.com/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-youtube-url' }),
    })

    const ctx = { waitUntil: vi.fn() } as any
    const response = await worker.default.fetch(request, env, ctx)
    expect(response.status).toBe(400)
    const body = await response.json() as any
    expect(body.error).toBe('INVALID_URL')
  })

  it('OPTIONS returns CORS headers', async () => {
    const worker = await import('../../src/backend/index')
    const env = createTestEnv()
    const ctx = { waitUntil: vi.fn() } as any

    const request = new Request('https://example.com/create', { method: 'OPTIONS' })
    const response = await worker.default.fetch(request, env, ctx)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('GET unknown route returns 404', async () => {
    const worker = await import('../../src/backend/index')
    const env = createTestEnv()
    const ctx = { waitUntil: vi.fn() } as any

    const request = new Request('https://example.com/unknown')
    const response = await worker.default.fetch(request, env, ctx)

    expect(response.status).toBe(404)
  })
})
