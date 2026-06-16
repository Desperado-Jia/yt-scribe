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
  }).catch((err) => {
    const writer = relay.transform.writable.getWriter()
    writer.write(new TextEncoder().encode(`data: {"type":"error","message":"${err.message}"}\n\n`))
    writer.close()
  })

  return {
    stream: relay.transform.readable,
    getAccumulatedText: relay.getAccumulatedText,
  }
}
