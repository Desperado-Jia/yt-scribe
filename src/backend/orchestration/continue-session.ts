import { ArticleService } from '../domain/article/article'
import { Store } from '../infra/store'

export interface ContinueSessionInput {
  sessionId: string
}

export interface ContinueSessionDeps {
  article: ArticleService
  store: Store
}

export function createContinueSession(deps: ContinueSessionDeps): (input: ContinueSessionInput) => Promise<ReadableStream> {
  const { article, store } = deps

  return async (input: ContinueSessionInput): Promise<ReadableStream> => {
    const session = await store.getSession(input.sessionId)
    if (!session) {
      throw new Error('SESSION_NOT_FOUND')
    }

    const { stream } = await article.continueStream({
      transcript: session.transcript,
      previousArticle: session.article,
    })

    // Accumulate continuation and update session
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const reader = stream.getReader()
    let continuationText = ''

    const relayAndSave = async () => {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        writer.write(value)
        // Accumulate continuation text from SSE frames
        const text = new TextDecoder().decode(value)
        const match = text.match(/"text":"((?:[^"\\]|\\.)*)"/)
        if (match) {
          continuationText += JSON.parse(`"${match[1]}"`)
        }
      }
      writer.close()

      await store.updateSession(input.sessionId, {
        article: session.article + continuationText,
        chapters: article.parseChapters(session.article + continuationText),
        status: 'complete',
      })
    }

    relayAndSave()
    return readable
  }
}
