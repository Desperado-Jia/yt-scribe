import { describe, it, expect, vi } from 'vitest'
import { createGenerateClient } from '../../../src/backend/infra/generate'

describe('createGenerateClient', () => {
  it('returns an object conforming to GenerateClient interface', () => {
    const client = createGenerateClient('test-key')
    expect(client).toHaveProperty('generateStream')
    expect(typeof client.generateStream).toBe('function')
  })

  it('constructs correct request to Gemini streamGenerateContent endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('data: {"candidates":[{"content":{"parts":[{"text":"hello"}]}}]}\n\n', { status: 200 })
    )
    globalThis.fetch = mockFetch

    const client = createGenerateClient('test-api-key')
    await client.generateStream('test prompt', 'system instruction')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-api-key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test prompt'),
      })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.systemInstruction.parts[0].text).toBe('system instruction')
    expect(body.contents[0].parts[0].text).toBe('test prompt')
  })

  it('omits systemInstruction when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response('data: {}\n\n', { status: 200 })
    )
    globalThis.fetch = mockFetch

    const client = createGenerateClient('key')
    await client.generateStream('prompt only')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.systemInstruction).toBeUndefined()
  })

  it('returns the response body ReadableStream directly', async () => {
    const mockStream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('test')); c.close() } })
    const mockFetch = vi.fn().mockResolvedValue(new Response(mockStream, { status: 200 }))
    globalThis.fetch = mockFetch

    const client = createGenerateClient('key')
    const stream = await client.generateStream('prompt')
    expect(stream).toBeInstanceOf(ReadableStream)
  })
})
