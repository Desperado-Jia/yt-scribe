export interface GenerateClient {
  generateStream(prompt: string, systemPrompt?: string): Promise<ReadableStream>
}

export function createGenerateClient(apiKey: string): GenerateClient {
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent'

  return {
    async generateStream(prompt: string, systemPrompt?: string): Promise<ReadableStream> {
      const url = `${baseUrl}?alt=sse&key=${apiKey}`
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
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
