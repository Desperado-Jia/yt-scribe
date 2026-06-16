import { describe, it, expect } from 'vitest'
import { parseVideoId, buildTimedtextUrl } from '../../../src/backend/domain/video/parser'

describe('parseVideoId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(parseVideoId('https://www.youtube.com/watch?v=xRh2sVcNXQ8')).toBe('xRh2sVcNXQ8')
  })

  it('extracts ID from short URL', () => {
    expect(parseVideoId('https://youtu.be/xRh2sVcNXQ8')).toBe('xRh2sVcNXQ8')
  })

  it('extracts ID from embed URL', () => {
    expect(parseVideoId('https://www.youtube.com/embed/xRh2sVcNXQ8')).toBe('xRh2sVcNXQ8')
  })

  it('extracts ID from URL with extra params', () => {
    expect(parseVideoId('https://www.youtube.com/watch?v=xRh2sVcNXQ8&t=120&list=PLabc')).toBe('xRh2sVcNXQ8')
  })

  it('extracts ID from youtu.be with params', () => {
    expect(parseVideoId('https://youtu.be/xRh2sVcNXQ8?si=abc123')).toBe('xRh2sVcNXQ8')
  })

  it('returns null for non-YouTube URL', () => {
    expect(parseVideoId('https://vimeo.com/12345')).toBeNull()
  })

  it('returns null for URL without video ID', () => {
    expect(parseVideoId('https://www.youtube.com/watch')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseVideoId('')).toBeNull()
  })
})

describe('buildTimedtextUrl', () => {
  it('builds timedtext URL for a video ID', () => {
    const url = buildTimedtextUrl('xRh2sVcNXQ8')
    expect(url).toContain('youtube.com')
    expect(url).toContain('xRh2sVcNXQ8')
    expect(url).toContain('timedtext')
  })
})
