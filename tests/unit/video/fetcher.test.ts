import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSubtitles } from '../../../src/backend/domain/video/fetcher'
import { ProxyTunnel } from '../../../src/backend/infra/proxy'

const MOCK_BASE_URL =
  'https://www.youtube.com/api/timedtext?v=test123&exp=1&sig=abc&fmt=vtt'

const MOCK_HARDCODED_VTT = `WEBVTT

00:00:00.160 --> 00:00:01.910
This new wave of AI companies is growing revenue like just like actual

00:00:01.910 --> 00:00:03.750
customer revenue actual demand translated through to dollars showing up`

function buildYtPageHtml(playerResponseJson: string): string {
  return `
    <html>
    <body>
    <script>
      ytInitialPlayerResponse = ${playerResponseJson};
      ytInitialData = {"other": "data"};
    </script>
    </body>
    </html>
  `
}

// Mock the hardcoded-subtitles module to avoid needing the generated map file
vi.mock('../../../src/backend/domain/video/hardcoded-subtitles', () => ({
  loadHardcodedSubtitle: vi.fn(),
}))

import { loadHardcodedSubtitle } from '../../../src/backend/domain/video/hardcoded-subtitles'

describe('fetchSubtitles', () => {
  let mockProxy: ProxyTunnel

  beforeEach(() => {
    mockProxy = { fetch: vi.fn() } as unknown as ProxyTunnel
    vi.restoreAllMocks()
  })

  it('returns hardcoded subtitles when available (skipYoutubeFetch=true)', async () => {
    vi.mocked(loadHardcodedSubtitle).mockReturnValue(MOCK_HARDCODED_VTT)
    const result = await fetchSubtitles('xRh2sVcNXQ8', mockProxy, true)
    expect(result).toContain('WEBVTT')
    expect(result.length).toBeGreaterThan(200)
  })

  it('returns hardcoded subtitles when available without YouTube fetch', async () => {
    vi.mocked(loadHardcodedSubtitle).mockReturnValue(MOCK_HARDCODED_VTT)
    const result = await fetchSubtitles('xRh2sVcNXQ8', mockProxy, false)
    expect(result).toContain('WEBVTT')
  }, 25000)

  it('extracts baseUrl from multi-line ytInitialPlayerResponse and fetches subtitles', async () => {
    vi.mocked(loadHardcodedSubtitle).mockReturnValue(null)

    const playerResponse = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: MOCK_BASE_URL,
              languageCode: 'en',
              kind: 'asr',
            },
          ],
        },
      },
    }

    const mockPageHtml = buildYtPageHtml(JSON.stringify(playerResponse))
    const mockVtt =
      'WEBVTT\n\n00:00:00.160 --> 00:00:01.910\nThis new wave of AI companies is growing revenue like just like actual\n\n00:00:01.910 --> 00:00:03.750\ncustomer revenue actual demand translated through to dollars showing up'

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(mockPageHtml, { status: 200 }))
      .mockResolvedValueOnce(new Response(mockVtt, { status: 200 }))

    const result = await fetchSubtitles('test123', mockProxy, false)

    expect(result).toBe(mockVtt)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)

    const secondCallUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]
    expect(secondCallUrl).toBe(MOCK_BASE_URL)
  }, 15000)
})
