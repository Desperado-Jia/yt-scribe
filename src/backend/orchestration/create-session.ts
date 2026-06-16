import { VideoService } from '../domain/video/video'
import { ArticleService } from '../domain/article/article'
import { Store } from '../infra/store'

export interface CreateSessionInput {
  url: string
  requirements?: string
}

export interface CreateSessionDeps {
  video: VideoService
  article: ArticleService
  store: Store
}

export function createSession(deps: CreateSessionDeps): (input: CreateSessionInput) => Promise<{ stream: ReadableStream; done: Promise<void> }> {
  const { video, article, store } = deps

  return async (input: CreateSessionInput): Promise<{ stream: ReadableStream; done: Promise<void> }> => {
    // 1. Parse video ID
    const videoId = video.parseVideoId(input.url)
    if (!videoId) {
      throw new Error('INVALID_URL')
    }

    // 2. Fetch subtitles
    let transcript: string
    try {
      transcript = await video.fetchSubtitles(videoId)
    } catch {
      throw new Error('SUBTITLE_FETCH_FAILED')
    }

    // 3. Validate
    const report = video.validate(transcript)
    if (!report.ok) {
      throw new Error('VIDEO_HAS_NO_SUBTITLE')
    }

    const sessionId = crypto.randomUUID()

    // 4. Generate article stream
    const { stream, getAccumulatedText } = article.generateStream({
      transcript: report.text,
      requirements: input.requirements,
    })

    // 5. Transform to add meta frame at start
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    writer.write(encoder.encode(`data: {"type":"meta","sessionId":"${sessionId}"}\n\n`))

    // 6. Pipe the article stream through
    const reader = stream.getReader()

    // Save session after stream completes
    const savePromise = (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          writer.write(value)
        }
        writer.close()

        const fullArticle = getAccumulatedText()
        const chapters = article.parseChapters(fullArticle)

        console.log(`[create-session] stream done, article=${fullArticle.length} chars, chapters=${chapters.length}`)
        await store.saveSession(sessionId, {
          videoUrl: input.url,
          requirements: input.requirements,
          transcript: '',
          article: fullArticle,
          chapters,
          createdAt: Date.now(),
          status: 'complete',
        })
        console.log(`[create-session] session ${sessionId} saved successfully`)
      } catch (err: any) {
        console.error(`[create-session] saveAfterStream FAILED: ${err?.message || err}`)
      }
    })()

    return { stream: readable, done: savePromise }
  }
}
