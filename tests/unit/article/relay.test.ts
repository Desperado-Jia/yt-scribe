import { describe, it, expect, vi } from 'vitest'
import { createRelay } from '../../../src/backend/domain/article/relay'

function createGeminiSSEChunk(text: string): Uint8Array {
  const data = JSON.stringify({
    candidates: [{ content: { parts: [{ text }] } }],
  })
  return new TextEncoder().encode(`data: ${data}\n\n`)
}

describe('createRelay', () => {
  it('transforms Gemini SSE to unified format', async () => {
    const relay = createRelay()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(createGeminiSSEChunk('Hello'))
        controller.enqueue(createGeminiSSEChunk(' World'))
        controller.close()
      },
    })

    const transformed = input.pipeThrough(relay.transform)
    const reader = transformed.getReader()
    const decoder = new TextDecoder()

    const chunks: string[] = []
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      chunks.push(decoder.decode(value))
    }

    const output = chunks.join('')
    expect(output).toContain('"type":"text"')
    expect(output).toContain('Hello')
    expect(output).toContain('World')
  })

  it('accumulates text as it relays', async () => {
    const relay = createRelay()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(createGeminiSSEChunk('First'))
        controller.enqueue(createGeminiSSEChunk(' Second'))
        controller.close()
      },
    })

    const transformed = input.pipeThrough(relay.transform)
    const reader = transformed.getReader()
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }

    expect(relay.getAccumulatedText()).toBe('First Second')
  })

  it('emits done event when stream completes', async () => {
    const relay = createRelay()
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(createGeminiSSEChunk('Done'))
        controller.close()
      },
    })

    const transformed = input.pipeThrough(relay.transform)
    const reader = transformed.getReader()
    const decoder = new TextDecoder()
    let lastChunk = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) lastChunk = decoder.decode(value)
    }

    expect(lastChunk).toContain('"type":"done"')
    expect(relay.isComplete()).toBe(true)
  })
})
