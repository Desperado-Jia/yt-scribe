export type StreamEvent =
  | { type: 'meta'; sessionId: string }
  | { type: 'text'; text: string }
  | { type: 'warning'; message: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type StreamCallback = (event: StreamEvent) => void

export function consumeSSE(response: Response, callback: StreamCallback): () => void {
  let cancelled = false

  async function read() {
    if (!response.body) {
      callback({ type: 'error', message: 'No response body' })
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (cancelled) {
        reader.cancel()
        return
      }

      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr) continue

        try {
          const event = JSON.parse(jsonStr) as StreamEvent
          callback(event)
        } catch {
          // Skip unparseable
        }
      }
    }
  }

  read()

  return () => {
    cancelled = true
  }
}
