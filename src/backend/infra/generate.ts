export interface GenerateClient {
  generateStream(prompt: string, systemPrompt?: string): Promise<ReadableStream>
}

export interface GenerateClientConfig {
  provider: 'gemini' | 'anthropic'
  apiKey: string
  model?: string
  baseUrl?: string
}

export function createGenerateClient(config: GenerateClientConfig): GenerateClient {
  switch (config.provider) {
    case 'anthropic':
      return createAnthropicClient(
        config.apiKey,
        config.model || 'claude-sonnet-4-6',
        config.baseUrl || 'https://api.anthropic.com/v1/messages'
      )
    case 'gemini':
    default:
      return createGeminiClient(config.apiKey)
  }
}

function createGeminiClient(apiKey: string): GenerateClient {
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'

  return {
    async generateStream(prompt: string, systemPrompt?: string): Promise<ReadableStream> {
      const url = `${baseUrl}?alt=sse&key=${apiKey}`
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }
      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Gemini API error ${response.status}: ${text}`)
      }

      if (!response.body) {
        throw new Error('Gemini API returned no response body')
      }

      return response.body
    },
  }
}

function createAnthropicClient(apiKey: string, model: string, baseUrl: string): GenerateClient {
  return {
    async generateStream(prompt: string, systemPrompt?: string): Promise<ReadableStream> {
      const body: Record<string, unknown> = {
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        thinking: { type: 'disabled' },
      }
      if (systemPrompt) {
        body.system = systemPrompt
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Anthropic API error ${response.status}: ${text}`)
      }

      if (!response.body) {
        throw new Error('Anthropic API returned no response body')
      }

      // Manually read Anthropic SSE and convert to Gemini-compatible SSE
      return anthropicToGeminiStream(response.body)
    },
  }
}

async function anthropicToGeminiStream(body: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const pump = async () => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const parsed = JSON.parse(jsonStr)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const text = parsed.delta.text
                if (text) {
                  const geminiFormat = JSON.stringify({
                    candidates: [{ content: { parts: [{ text }] } }],
                  })
                  writer.write(encoder.encode(`data: ${geminiFormat}\n\n`))
                }
              }
            } catch {
              // Skip unparseable frames
            }
          }
        }
      }
      // Flush decoder
      buffer += decoder.decode()
      if (buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim()
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              const text = parsed.delta.text
              if (text) {
                const geminiFormat = JSON.stringify({
                  candidates: [{ content: { parts: [{ text }] } }],
                })
                writer.write(encoder.encode(`data: ${geminiFormat}\n\n`))
              }
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      try { writer.close() } catch { /* already closed */ }
    }
  }

  pump()
  return readable
}
