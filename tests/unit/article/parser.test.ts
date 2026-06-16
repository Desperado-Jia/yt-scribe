import { describe, it, expect } from 'vitest'
import { parseChapters } from '../../../src/backend/domain/article/parser'

describe('parseChapters', () => {
  it('splits markdown by ## headings', () => {
    const md = '## Chapter 1\nContent one.\n\n## Chapter 2\nContent two.'
    const chapters = parseChapters(md)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
    expect(chapters[1].title).toBe('Chapter 2')
    expect(chapters[0].index).toBe(0)
    expect(chapters[1].index).toBe(1)
  })

  it('returns empty array for markdown without ## headings', () => {
    const chapters = parseChapters('Just some text without headings.')
    expect(chapters).toHaveLength(0)
  })

  it('does not split on ### headings', () => {
    const md = '## Main\nContent.\n\n### Sub\nMore content.'
    const chapters = parseChapters(md)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Main')
  })

  it('protects ## inside code blocks', () => {
    const md = '## Intro\nText.\n\n```\n## Not a chapter\n```\n\n## Real Chapter\nMore text.'
    const chapters = parseChapters(md)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Intro')
    expect(chapters[1].title).toBe('Real Chapter')
  })

  it('sets correct startOffset and endOffset', () => {
    const md = '## Ch1\nContent of chapter one.\n\n## Ch2\nContent of chapter two.'
    const chapters = parseChapters(md)
    expect(chapters[0].startOffset).toBe(0)
    expect(chapters[1].startOffset).toBeGreaterThan(chapters[0].endOffset)
    expect(chapters[1].endOffset).toBeLessThanOrEqual(md.length)
  })

  it('handles single chapter markdown', () => {
    const md = '## Single Chapter\nAll content here.'
    const chapters = parseChapters(md)
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Single Chapter')
    expect(chapters[0].startOffset).toBe(0)
    expect(chapters[0].endOffset).toBe(md.length)
  })
})
