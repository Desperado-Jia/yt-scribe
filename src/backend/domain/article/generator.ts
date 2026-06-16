import { GenerateClient } from '../../infra/generate'
import { buildArticlePrompt } from './prompt'
import { createRelay } from './relay'

export function generateArticle(
  transcript: string,
  requirements: string | undefined,
  generate: GenerateClient
): {
  stream: ReadableStream
  getAccumulatedText: () => string
} {
  const prompt = buildArticlePrompt(transcript, requirements)
  const systemPrompt = `You are a professional Chinese technology content editor. Always respond in Chinese. Format your response with ## headings for chapters. Use conversational tone.`

  const relay = createRelay()

  const rawStream = generate.generateStream(prompt, systemPrompt)
  rawStream.then((stream) => {
    stream.pipeTo(relay.transform.writable)
  }).catch(async (err) => {
    const writer = relay.transform.writable.getWriter()
    const safeMsg = err instanceof Error ? err.message.replace(/\n/g, ' ') : 'Gemini API error'
    await writer.write(new TextEncoder().encode(`data: {"type":"error","message":"${safeMsg}"}\n\n`))
    writer.close()
  })

  return {
    stream: relay.transform.readable,
    getAccumulatedText: relay.getAccumulatedText,
  }
}
