import { describe, it, expect } from 'vitest'
import { matchHighlights, HighlightMatch } from '../../../src/backend/domain/analysis/matcher'

describe('matchHighlights', () => {
  const text = 'Elon Musk announced the AI revolution. The event took place in San Francisco last Tuesday.'

  it('matches by exact contextAnchor (layer 1)', () => {
    const highlights = [
      { dimension: 'who' as const, phrase: 'Elon Musk', contextAnchor: 'Elon Musk announced' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches).toHaveLength(1)
    expect(matches[0].dimension).toBe('who')
    expect(matches[0].phrase).toBe('Elon Musk')
    expect(matches[0].startIndex).toBe(0)
    expect(matches[0].endIndex).toBe(9)
  })

  it('falls back to fuzzy regex match (layer 2) when exact fails', () => {
    const highlights = [
      { dimension: 'where' as const, phrase: 'San Francisco', contextAnchor: 'in San Francisco last' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches).toHaveLength(1)
    expect(matches[0].dimension).toBe('where')
  })

  it('falls back to phrase-only match (layer 3) when all else fails', () => {
    const highlights = [
      { dimension: 'when' as const, phrase: 'Tuesday', contextAnchor: 'nonexistent anchor' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches).toHaveLength(1)
    expect(matches[0].dimension).toBe('when')
  })

  it('returns empty array when no match possible', () => {
    const highlights = [
      { dimension: 'why' as const, phrase: 'nonexistent phrase', contextAnchor: 'completely missing' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches).toHaveLength(0)
  })

  it('deduplicates overlapping matches', () => {
    const highlights = [
      { dimension: 'who' as const, phrase: 'Elon', contextAnchor: 'Elon Musk' },
      { dimension: 'who' as const, phrase: 'Elon Musk', contextAnchor: 'Elon Musk announced' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches.length).toBeLessThanOrEqual(1)
  })

  it('handles multiple dimension highlights', () => {
    const highlights = [
      { dimension: 'who' as const, phrase: 'Elon Musk', contextAnchor: 'Elon Musk announced' },
      { dimension: 'what' as const, phrase: 'AI revolution', contextAnchor: 'the AI revolution' },
    ]
    const matches = matchHighlights(text, highlights)
    expect(matches).toHaveLength(2)
  })
})
