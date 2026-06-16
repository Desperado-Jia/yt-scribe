import { ProxyTunnel } from '../../infra/proxy'
import { loadHardcodedSubtitle } from './hardcoded-subtitles'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const FETCH_TIMEOUT_MS = 10_000

// Well-known YouTube innertube API key — extracted from the YouTube web client
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

// Language priority: English first, then Chinese, then any other
const LANG_PRIORITY = [
  /^en/,
  /^zh-Hans$/,
  /^zh$/,
  /^zh-CN$/,
  /^zh-Hant$/,
  /^zh-TW$/,
]

interface CaptionTrack {
  baseUrl: string
  languageCode: string
  kind?: string // 'asr' = auto-generated, absent or other = manual
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ])
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

function selectBestCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  // Prefer manual (non-asr) over auto-generated, but still include asr
  const scored = tracks.map((t) => {
    let langScore = LANG_PRIORITY.length // default: lowest priority
    for (let i = 0; i < LANG_PRIORITY.length; i++) {
      if (LANG_PRIORITY[i].test(t.languageCode)) {
        langScore = i
        break
      }
    }
    // Manual captions get priority bump (lower score = better)
    const kindScore = t.kind === 'asr' ? 1 : 0
    return { track: t, score: langScore * 10 + kindScore }
  })

  scored.sort((a, b) => a.score - b.score)
  return scored[0]?.track ?? null
}

function extractCaptionTracks(playerResponse: unknown): CaptionTrack[] {
  const pr = playerResponse as Record<string, unknown>
  const pctr = pr?.captions as Record<string, unknown> | undefined
  const tracks = pctr?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined
  const captionTracks = tracks?.captionTracks as Array<Record<string, unknown>> | undefined
  if (!captionTracks) return []

  return captionTracks
    .filter((t) => typeof t.baseUrl === 'string' && typeof t.languageCode === 'string')
    .map((t) => ({
      baseUrl: t.baseUrl as string,
      languageCode: t.languageCode as string,
      kind: t.kind as string | undefined,
    }))
}

async function fetchPlayerResponse(
  videoId: string,
  context: Record<string, unknown>,
  apiKey: string,
  innertubeHost: string
): Promise<unknown> {
  const url = `https://${innertubeHost}/youtubei/v1/player?key=${apiKey}&prettyPrint=false`
  const body = JSON.stringify({
    context,
    videoId,
  })

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Innertube player API failed: ${response.status}`)
  }

  return response.json()
}

async function fetchVttFromBaseUrl(baseUrl: string): Promise<string> {
  // Ensure the URL returns VTT format by appending fmt=vtt if not present
  const url = baseUrl.includes('fmt=') ? baseUrl : `${baseUrl}&fmt=vtt`
  const response = await fetchWithTimeout(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!response.ok) throw new Error(`Timedtext fetch failed: ${response.status}`)
  return response.text()
}

async function fetchSubtitlesFromPlayerResponse(
  playerResponse: unknown,
  _videoId: string
): Promise<string | null> {
  const captionTracks = extractCaptionTracks(playerResponse)
  if (captionTracks.length === 0) return null

  const best = selectBestCaptionTrack(captionTracks)
  if (!best) return null

  return fetchVttFromBaseUrl(best.baseUrl)
}

function extractPlayerResponseFromHtml(html: string): unknown | null {
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function extractApiKeyFromHtml(html: string): string | null {
  // Try to extract INNERTUBE_API_KEY from ytcfg
  const ytcfgMatch = html.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/s)
  if (ytcfgMatch) {
    try {
      const ytcfg = JSON.parse(ytcfgMatch[1])
      if (ytcfg.INNERTUBE_API_KEY) return ytcfg.INNERTUBE_API_KEY
    } catch {
      // Fall through
    }
  }
  // Try direct pattern match in the page source
  const keyMatch = html.match(/"innertubeApiKey"\s*:\s*"([^"]+)"/)
  if (keyMatch) return keyMatch[1]
  return null
}

async function fetchSubtitlesFromYoutube(
  videoId: string,
  proxy: ProxyTunnel
): Promise<string> {
  // Step 1: Fetch YouTube watch page
  const pageResponse = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    },
  })

  if (!pageResponse.ok) {
    throw new Error(`YouTube page fetch failed: ${pageResponse.status}`)
  }

  const html = await pageResponse.text()

  // Extract API key from page (fallback to well-known key)
  const apiKey = extractApiKeyFromHtml(html) || INNERTUBE_API_KEY

  // Strategy 1: Extract captions from ytInitialPlayerResponse (web client)
  const webPlayerResponse = extractPlayerResponseFromHtml(html)
  if (webPlayerResponse) {
    const vtt = await fetchSubtitlesFromPlayerResponse(webPlayerResponse, videoId)
    if (vtt && vtt.trim().length >= 200) return vtt
  }

  // Strategy 2: Innertube API with android client (more reliable for captions)
  try {
    const androidResponse = await withTimeout(
      fetchPlayerResponse(
        videoId,
        {
          client: {
            clientName: 'ANDROID',
            clientVersion: '21.02.35',
            androidSdkVersion: 30,
            osName: 'Android',
            osVersion: '11',
            userAgent:
              'com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip',
          },
        },
        apiKey,
        'www.youtube.com'
      ),
      FETCH_TIMEOUT_MS
    )

    const vtt = await fetchSubtitlesFromPlayerResponse(androidResponse, videoId)
    if (vtt && vtt.trim().length >= 200) return vtt
  } catch {
    // Fall through to next client
  }

  // Strategy 3: Innertube API with mweb client
  try {
    const mwebResponse = await withTimeout(
      fetchPlayerResponse(
        videoId,
        {
          client: {
            clientName: 'MWEB',
            clientVersion: '2.20260115.01.00',
          },
        },
        apiKey,
        'www.youtube.com'
      ),
      FETCH_TIMEOUT_MS
    )

    const vtt = await fetchSubtitlesFromPlayerResponse(mwebResponse, videoId)
    if (vtt && vtt.trim().length >= 200) return vtt
  } catch {
    // Fall through
  }

  // Strategy 4: Proxy-based innertube fetch
  try {
    const vtt = await withTimeout(fetchViaInnertubeProxy(videoId, proxy), FETCH_TIMEOUT_MS)
    if (vtt && vtt.trim().length >= 200) return vtt
  } catch {
    // Fall through
  }

  throw new Error('VIDEO_HAS_NO_SUBTITLE')
}

export async function fetchSubtitles(
  videoId: string,
  proxy: ProxyTunnel,
  skipYoutubeFetch: boolean
): Promise<string> {
  // Strategy 1: Check hardcoded assets (fast, local)
  const hardcoded = loadHardcodedSubtitle(videoId)
  if (hardcoded) return hardcoded

  if (skipYoutubeFetch) {
    throw new Error('VIDEO_HAS_NO_SUBTITLE')
  }

  // Strategy 2: Fetch from YouTube via multiple approaches
  try {
    const vtt = await fetchSubtitlesFromYoutube(videoId, proxy)
    if (vtt && vtt.trim().length >= 200) return vtt
  } catch {
    // Fall through to error
  }

  throw new Error('VIDEO_HAS_NO_SUBTITLE')
}

async function fetchViaInnertubeProxy(videoId: string, proxy: ProxyTunnel): Promise<string> {
  const apiKey = INNERTUBE_API_KEY
  const body = JSON.stringify({
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '21.02.35',
        androidSdkVersion: 30,
        osName: 'Android',
        osVersion: '11',
        userAgent:
          'com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip',
      },
    },
    videoId,
  })

  const response = await proxy.fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body,
    }
  )

  if (!response.ok) throw new Error(`Proxy innertube fetch failed: ${response.status}`)
  const playerResponse = await response.json()
  const captionTracks = extractCaptionTracks(playerResponse)
  if (captionTracks.length === 0) throw new Error('No caption tracks from proxy')

  const best = selectBestCaptionTrack(captionTracks)
  if (!best) throw new Error('No suitable caption track from proxy')

  const vttResponse = await proxy.fetch(best.baseUrl, {
    method: 'GET',
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!vttResponse.ok) throw new Error(`Proxy VTT fetch failed: ${vttResponse.status}`)
  return vttResponse.text()
}

