import { GenerateClient } from '../../infra/generate'
import { parseChapters, ChapterMeta } from './parser'
import { generateArticle } from './generator'
import { createRelay } from './relay'

export { ChapterMeta }

export interface ArticleService {
  generateStream(params: {
    transcript: string
    requirements?: string
  }): { stream: ReadableStream; getAccumulatedText: () => string }
  continueStream(params: {
    transcript: string
    previousArticle: string
  }): Promise<{ stream: ReadableStream }>
  parseChapters(markdown: string): ChapterMeta[]
}

export interface ArticleServiceInput {
  generate: GenerateClient
}

export function createArticleService(input: ArticleServiceInput): ArticleService {
  const generate = input.generate

  return {
    generateStream(params: { transcript: string; requirements?: string }) {
      return generateArticle(params.transcript, params.requirements, generate)
    },

    async continueStream(params: { transcript: string; previousArticle: string }) {
      const continuationPrompt = `以下是已生成的文章前半部分：

${params.previousArticle}

请继续生成文章的后续章节。维持相同的对话体中文风格和章节结构（## 标题）。

字幕原文供参考：
${params.transcript}`

      const relay = createRelay()
      const rawStream = await generate.generateStream(continuationPrompt)
      rawStream.pipeTo(relay.transform.writable)
      return { stream: relay.transform.readable }
    },

    parseChapters(markdown: string): ChapterMeta[] {
      return parseChapters(markdown)
    },
  }
}
