import { HARDCODED_SUBTITLES_MAP } from './hardcoded-subtitles-map.gen'

const LANG_PRIORITY = [/^en/, /^zh-Hans$/, /^zh$/, /^zh-CN$/, /^zh-Hant$/, /^zh-TW$/]

/**
 * Try to load a hardcoded subtitle from the build-time assets map.
 * Returns the VTT content if a subtitle file exists for the given video ID,
 * or null if no hardcoded subtitle is available.
 */
export function loadHardcodedSubtitle(videoId: string): string | null {
  const langMap = HARDCODED_SUBTITLES_MAP[videoId]
  if (!langMap) return null

  // Pick the best language match
  for (const pattern of LANG_PRIORITY) {
    for (const [lang, content] of Object.entries(langMap)) {
      if (pattern.test(lang)) return content
    }
  }

  // Fallback: return the first available language
  return Object.values(langMap)[0] ?? null
}
