import { describe, it, expect, vi } from 'vitest'
import { createVideoService } from '../../../src/backend/domain/video/video'
import { ProxyTunnel } from '../../../src/backend/infra/proxy'

describe('createVideoService', () => {
  const mockProxy: ProxyTunnel = { fetch: vi.fn() } as unknown as ProxyTunnel

  it('parses a valid YouTube URL', () => {
    const service = createVideoService({
      proxy: mockProxy,
      demoVideoId: 'xRh2sVcNXQ8',
    })
    const videoId = service.parseVideoId('https://www.youtube.com/watch?v=xRh2sVcNXQ8')
    expect(videoId).toBe('xRh2sVcNXQ8')
  })

  it('returns null for invalid URL', () => {
    const service = createVideoService({
      proxy: mockProxy,
      demoVideoId: 'xRh2sVcNXQ8',
    })
    const videoId = service.parseVideoId('not a url')
    expect(videoId).toBeNull()
  })

  it('validates sufficient subtitle content', () => {
    const service = createVideoService({
      proxy: mockProxy,
      demoVideoId: 'xRh2sVcNXQ8',
    })
    const validVTT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world, this is a test subtitle track with enough content.

00:00:06.000 --> 00:00:10.000
It contains enough characters to pass the minimum threshold validation.

00:00:11.000 --> 00:00:15.000
This is additional content to make sure we have more than two hundred characters.

00:00:16.000 --> 00:00:20.000
The subtitle validator requires at least 200 trimmed characters to pass.`
    const report = service.validate(validVTT)
    expect(report.ok).toBe(true)
  })

  it('rejects insufficient subtitle content', () => {
    const service = createVideoService({
      proxy: mockProxy,
      demoVideoId: 'xRh2sVcNXQ8',
    })
    const report = service.validate('too short')
    expect(report.ok).toBe(false)
  })
})
