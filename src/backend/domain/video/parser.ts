const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

export function parseVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX)
  return match ? match[1] : null
}

export function buildTimedtextUrl(videoId: string, lang?: string): string {
  const langParam = lang ? `&lang=${lang}` : ''
  return `https://www.youtube.com/api/timedtext?v=${videoId}${langParam}&fmt=vtt`
}
