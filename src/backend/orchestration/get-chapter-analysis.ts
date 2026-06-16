import { AnalysisService } from '../domain/analysis/analysis'
import { Store, ChapterAnalysisData } from '../infra/store'

export interface GetChapterAnalysisInput {
  sessionId: string
  chapterIndex: number
}

export interface GetChapterAnalysisDeps {
  analysis: AnalysisService
  store: Store
}

export function createGetChapterAnalysis(deps: GetChapterAnalysisDeps): (input: GetChapterAnalysisInput) => Promise<ChapterAnalysisData> {
  const { analysis, store } = deps

  return async (input: GetChapterAnalysisInput): Promise<ChapterAnalysisData> => {
    // Check cache
    const cached = await store.getChapterAnalysis(input.sessionId, input.chapterIndex)
    if (cached) return cached

    // Load session
    const session = await store.getSession(input.sessionId)
    if (!session) {
      throw new Error('SESSION_NOT_FOUND')
    }

    // Extract chapter content
    const chapter = session.chapters[input.chapterIndex]
    if (!chapter) {
      throw new Error('CHAPTER_NOT_FOUND')
    }
    const chapterContent = session.article.slice(chapter.startOffset, chapter.endOffset)

    // Build global context (video title + chapter index)
    const globalContext = session.chapters
      .map((c) => `- ${c.title}`)
      .join('\n')

    // Generate analysis
    const stream = await analysis.analyzeChapter({
      chapterTitle: chapter.title,
      chapterContent,
      globalContext,
    })

    // Read and parse the JSON response
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) {
        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6))
              const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
              if (content) fullResponse += content
            } catch { /* skip */ }
          }
        }
      }
    }
    // Flush decoder buffer
    fullResponse += decoder.decode()

    // Extract JSON object from response (handle text before/after)
    const trimmed = fullResponse.trim()
    let jsonStr = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // If still not parseable, try to extract the outermost { } block
    if (!jsonStr.startsWith('{')) {
      const firstBrace = jsonStr.indexOf('{')
      const lastBrace = jsonStr.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1)
      }
    }
    const result = JSON.parse(jsonStr) as ChapterAnalysisData

    // Cache result
    await store.saveChapterAnalysis(input.sessionId, input.chapterIndex, result)

    return result
  }
}
