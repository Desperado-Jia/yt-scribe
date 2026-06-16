import { describe, it, expect, vi } from 'vitest'
import { analyzeChapter } from '../../../src/backend/domain/analysis/extractor'
import { GenerateClient } from '../../../src/backend/infra/generate'

describe('analyzeChapter', () => {
  it('calls generate.generateStream and returns a stream', async () => {
    const mockStream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"{\\"summary\\":{\\"who\\":\\"Mark\\",\\"what\\":\\"AI growth\\"},\\"highlights\\":[]}"}}]}}]}\n\n'))
        c.close()
      },
    })

    const mockGenerate: GenerateClient = {
      generateStream: vi.fn().mockResolvedValue(mockStream),
    }

    const stream = await analyzeChapter(
      'AI Revenue',
      'Content about AI revenue growth...',
      'Global: video about AI industry',
      mockGenerate
    )

    expect(mockGenerate.generateStream).toHaveBeenCalled()
    expect(stream).toBeInstanceOf(ReadableStream)
  })
})
