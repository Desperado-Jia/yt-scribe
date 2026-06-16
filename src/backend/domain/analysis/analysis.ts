import { GenerateClient } from '../../infra/generate'
import { analyzeChapter } from './extractor'

export interface AnalysisService {
  analyzeChapter(params: {
    chapterTitle: string
    chapterContent: string
    globalContext: string
  }): Promise<ReadableStream>
}

export interface AnalysisServiceInput {
  generate: GenerateClient
}

export function createAnalysisService(input: AnalysisServiceInput): AnalysisService {
  const generate = input.generate

  return {
    async analyzeChapter(params: {
      chapterTitle: string
      chapterContent: string
      globalContext: string
    }): Promise<ReadableStream> {
      return analyzeChapter(
        params.chapterTitle,
        params.chapterContent,
        params.globalContext,
        generate
      )
    },
  }
}
