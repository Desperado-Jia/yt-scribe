export interface HighlightMatch {
  startIndex: number
  endIndex: number
  dimension: 'who' | 'what' | 'when' | 'where' | 'why' | 'how'
  phrase: string
}

interface HighlightInput {
  dimension: 'who' | 'what' | 'when' | 'where' | 'why' | 'how'
  phrase: string
  contextAnchor: string
}

export function matchHighlights(
  virtualText: string,
  highlights: HighlightInput[]
): HighlightMatch[] {
  const matches: HighlightMatch[] = []
  const occupiedRanges: Array<[number, number]> = []

  function isOverlapping(start: number, end: number): boolean {
    return occupiedRanges.some(([s, e]) => start < e && end > s)
  }

  for (const hl of highlights) {
    let startIndex = -1
    let endIndex = -1

    // Layer 1: Exact contextAnchor match
    const anchorIdx = virtualText.indexOf(hl.contextAnchor)
    if (anchorIdx !== -1) {
      const phraseStart = virtualText.indexOf(hl.phrase, anchorIdx)
      if (phraseStart !== -1 && phraseStart <= anchorIdx + hl.contextAnchor.length) {
        startIndex = phraseStart
        endIndex = phraseStart + hl.phrase.length
      }
    }

    // Layer 2: Fuzzy regex match
    if (startIndex === -1) {
      const escapedPhrase = hl.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const fuzzyPattern = escapedPhrase.replace(/[\s.,;:!?，。；：！？]+/g, '\\s*')
      const regex = new RegExp(fuzzyPattern, 'i')
      const match = regex.exec(virtualText)
      if (match) {
        startIndex = match.index
        endIndex = startIndex + match[0].length
      }
    }

    // Layer 3: Phrase-only fallback
    if (startIndex === -1) {
      const phraseIdx = virtualText.indexOf(hl.phrase)
      if (phraseIdx !== -1) {
        startIndex = phraseIdx
        endIndex = phraseIdx + hl.phrase.length
      }
    }

    if (startIndex !== -1 && endIndex !== -1 && !isOverlapping(startIndex, endIndex)) {
      matches.push({
        startIndex,
        endIndex,
        dimension: hl.dimension,
        phrase: hl.phrase,
      })
      occupiedRanges.push([startIndex, endIndex])
    }
  }

  return matches
}
