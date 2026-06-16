import { describe, it, expect, vi } from 'vitest'
import { generateArticle } from '../../../src/backend/domain/article/generator'
import { GenerateClient } from '../../../src/backend/infra/generate'

describe('generateArticle', () => {
  it('calls generate.generateStream with correct prompt', async () => {
    const mockStream = new ReadableStream({
      start(c) {
        const data = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] })
        c.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
        c.close()
      },
    })

    const mockGenerate: GenerateClient = {
      generateStream: vi.fn().mockResolvedValue(mockStream),
    }

    const { stream, getAccumulatedText } = generateArticle(
      'test transcript',
      'be technical',
      mockGenerate
    )

    expect(mockGenerate.generateStream).toHaveBeenCalled()
    expect(stream).toBeInstanceOf(ReadableStream)
    expect(typeof getAccumulatedText).toBe('function')
  })
})
