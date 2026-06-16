import { describe, it, expect } from 'vitest'
import { validateSubtitle, SubtitleReport } from '../../../src/backend/domain/video/validator'

describe('validateSubtitle', () => {
  const validVTT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Hello world, this is a test subtitle track with enough content.

00:00:06.000 --> 00:00:10.000
It contains enough characters to pass the minimum threshold validation.

00:00:11.000 --> 00:00:15.000
This is additional content to make sure we have more than two hundred characters.

00:00:16.000 --> 00:00:20.000
The subtitle validator requires at least 200 trimmed characters to pass.`

  it('validates a sufficient subtitle', () => {
    const result = validateSubtitle(validVTT)
    expect(result.ok).toBe(true)
    expect(result.truncated).toBe(false)
  })

  it('rejects subtitle with fewer than 200 trimmed chars', () => {
    const result = validateSubtitle('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nShort.')
    expect(result.ok).toBe(false)
  })

  it('truncates at sentence boundary when exceeding maxChars', () => {
    const longText = 'A'.repeat(1000) + '。\n' + 'B'.repeat(500)
    const result = validateSubtitle(longText, 500)
    expect(result.truncated).toBe(true)
    expect(result.text.length).toBeLessThanOrEqual(1001)
  })

  it('truncates at newline when no sentence boundary found', () => {
    const longText = 'A'.repeat(1000) + '\n' + 'B'.repeat(500)
    const result = validateSubtitle(longText, 500)
    expect(result.truncated).toBe(true)
  })

  it('returns original text length', () => {
    const result = validateSubtitle(validVTT)
    expect(result.originalLength).toBe(validVTT.length)
  })
})
