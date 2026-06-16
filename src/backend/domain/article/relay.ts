export function createRelay(): {
  transform: TransformStream<Uint8Array, Uint8Array>
  getAccumulatedText: () => string
  isComplete: () => boolean
} {
  let accumulatedText = ''
  let completed = false
  const encoder = new TextEncoder()

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk)
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]' || jsonStr === '') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (content) {
            accumulatedText += content
            const unified = JSON.stringify({ type: 'text', text: content })
            controller.enqueue(encoder.encode(`data: ${unified}\n\n`))
          }
        } catch {
          // Skip unparseable frames
        }
      }
    },
    flush(controller) {
      completed = true
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
    },
  })

  return {
    transform,
    getAccumulatedText: () => accumulatedText,
    isComplete: () => completed,
  }
}
