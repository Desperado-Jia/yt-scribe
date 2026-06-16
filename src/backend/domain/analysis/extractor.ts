import { GenerateClient } from '../../infra/generate'
import { buildChapterAnalysisPrompt } from '../article/prompt'

export async function analyzeChapter(
  chapterTitle: string,
  chapterContent: string,
  globalContext: string,
  generate: GenerateClient
): Promise<ReadableStream> {
  const prompt = buildChapterAnalysisPrompt(chapterTitle, chapterContent, globalContext)

  const systemPrompt = `You are a content analysis expert. Always respond in JSON format with the exact structure requested. Return valid, parseable JSON only.`

  return generate.generateStream(prompt, systemPrompt)
}
