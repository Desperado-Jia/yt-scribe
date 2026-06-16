export interface SubtitleReport {
  ok: boolean
  text: string
  truncated: boolean
  originalLength: number
}

const MIN_CHARS = 200

function stripVtt(vtt: string): string {
  const lines = vtt.split('\n')
  const textLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim()

    // Skip WEBVTT header
    if (line === 'WEBVTT' || line.startsWith('Kind:') || line.startsWith('Language:')) continue

    // Skip timestamp lines
    if (line.includes('-->')) continue

    // Skip empty lines and numeric cue identifiers
    if (!line || /^\d+$/.test(line)) continue

    // Strip VTT tags like <c>, </c>, <v>, <00:00:00.000>, etc.
    line = line.replace(/<[^>]*>/g, '')

    // Strip VTT cue settings (alignment, position, etc.)
    line = line.replace(/align:\w+/i, '').replace(/position:\d+%/i, '').trim()

    if (line) textLines.push(line)
  }

  return textLines.join('\n')
}

export function validateSubtitle(vtt: string, maxChars?: number): SubtitleReport {
  const text = stripVtt(vtt)
  const originalLength = text.length
  const ok = text.length >= MIN_CHARS

  if (maxChars && text.length > maxChars) {
    const segment = text.slice(maxChars)
    const boundaryMatch = segment.match(/[。！？\n]/)
    const cutIndex = boundaryMatch
      ? maxChars + boundaryMatch.index! + 1
      : text.length

    return {
      ok,
      text: text.slice(0, cutIndex),
      truncated: cutIndex < text.length,
      originalLength,
    }
  }

  return { ok, text, truncated: false, originalLength }
}
