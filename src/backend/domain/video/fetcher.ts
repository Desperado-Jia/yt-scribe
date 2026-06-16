import { ProxyTunnel } from '../../infra/proxy'
import { buildTimedtextUrl } from './parser'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const RETRY_DELAYS = [2000, 5000] // exponential-ish backoff

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchSubtitles(
  videoId: string,
  proxy: ProxyTunnel,
  demoVideoId: string,
  skipYoutubeFetch: boolean
): Promise<string> {
  // Direct fetch
  if (!skipYoutubeFetch) {
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1])

        const vtt = await fetchViaDirect(videoId)
        if (vtt && vtt.trim().length >= 200) return vtt
      } catch {
        // Fall through to next attempt
      }
    }

    // Proxy fetch
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1])

        const vtt = await fetchViaProxy(videoId, proxy)
        if (vtt && vtt.trim().length >= 200) return vtt
      } catch {
        // Fall through to hardcoded
      }
    }
  }

  // Hardcoded fallback
  if (videoId === demoVideoId) {
    const { HARDCODED_SUBTITLES } = await import('./hardcoded-subtitles')
    return HARDCODED_SUBTITLES
  }

  throw new Error('VIDEO_HAS_NO_SUBTITLE')
}

async function fetchViaDirect(videoId: string): Promise<string> {
  // Step 1: Fetch video page to find timedtext URL
  const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    },
  })

  if (!pageResponse.ok) {
    throw new Error(`YouTube page fetch failed: ${pageResponse.status}`)
  }

  const html = await pageResponse.text()

  // Extract ytInitialPlayerResponse
  const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
  if (!playerResponseMatch) {
    // Try direct timedtext API as fallback
    return fetchTimedtext(buildTimedtextUrl(videoId))
  }

  const playerResponse = JSON.parse(playerResponseMatch[1])
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

  if (captionTracks && captionTracks.length > 0) {
    const baseUrl = captionTracks[0].baseUrl
    return fetchTimedtext(baseUrl)
  }

  throw new Error('No caption tracks found')
}

async function fetchTimedtext(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new Error(`Timedtext fetch failed: ${response.status}`)
  return response.text()
}

async function fetchViaProxy(videoId: string, proxy: ProxyTunnel): Promise<string> {
  const timedtextUrl = buildTimedtextUrl(videoId)
  const response = await proxy.fetch(timedtextUrl, {
    method: 'GET',
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new Error(`Proxy timedtext fetch failed: ${response.status}`)
  return response.text()
}
