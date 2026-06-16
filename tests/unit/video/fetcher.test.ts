import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSubtitles } from '../../../src/backend/domain/video/fetcher'
import { ProxyTunnel } from '../../../src/backend/infra/proxy'

describe('fetchSubtitles', () => {
  let mockProxy: ProxyTunnel

  beforeEach(() => {
    mockProxy = { fetch: vi.fn() } as unknown as ProxyTunnel
  })

  it('returns hardcoded subtitles for SKIP_YOUTUBE_FETCH=true', async () => {
    const result = await fetchSubtitles('xRh2sVcNXQ8', mockProxy, 'xRh2sVcNXQ8', true)
    expect(result).toContain('WEBVTT')
    expect(result.length).toBeGreaterThan(200)
  })

  it('falls back to hardcoded when videoId matches DEMO_VIDEO_ID and fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const result = await fetchSubtitles('xRh2sVcNXQ8', mockProxy, 'xRh2sVcNXQ8', false)
    expect(result).toContain('WEBVTT')
  }, 25000)
})
