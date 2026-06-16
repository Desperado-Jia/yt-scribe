export interface SubtitleReport {
  ok: boolean
  text: string
  truncated: boolean
  originalLength: number
}

const MIN_CHARS = 200

export function validateSubtitle(vtt: string, maxChars?: number): SubtitleReport {
  const trimmed = vtt.trim()
  const originalLength = trimmed.length
  const ok = trimmed.length >= MIN_CHARS

  if (maxChars && trimmed.length > maxChars) {
    const segment = trimmed.slice(maxChars)
    const boundaryMatch = segment.match(/[。！？\n]/)
    const cutIndex = boundaryMatch
      ? maxChars + boundaryMatch.index! + 1
      : trimmed.length

    return {
      ok,
      text: trimmed.slice(0, cutIndex),
      truncated: cutIndex < trimmed.length,
      originalLength,
    }
  }

  return { ok, text: trimmed, truncated: false, originalLength }
}
