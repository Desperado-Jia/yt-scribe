import { parseVideoId } from './parser'
import { validateSubtitle, SubtitleReport } from './validator'
import { fetchSubtitles } from './fetcher'
import { ProxyTunnel } from '../../infra/proxy'

export interface VideoService {
  parseVideoId(url: string): string | null
  fetchSubtitles(videoId: string): Promise<string>
  validate(vtt: string, maxChars?: number): SubtitleReport
}

export interface VideoServiceInput {
  proxy: ProxyTunnel
  skipYoutubeFetch?: boolean
  maxChars?: number
}

export function createVideoService(input: VideoServiceInput): VideoService {
  const proxy = input.proxy
  const skipYoutubeFetch = !!input.skipYoutubeFetch
  const maxChars = input.maxChars

  return {
    parseVideoId(url: string): string | null {
      return parseVideoId(url)
    },

    async fetchSubtitles(videoId: string): Promise<string> {
      return fetchSubtitles(videoId, proxy, skipYoutubeFetch)
    },

    validate(vtt: string): SubtitleReport {
      return validateSubtitle(vtt, maxChars)
    },
  }
}
