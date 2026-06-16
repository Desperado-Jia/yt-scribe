import { bootstrap, Env } from './bootstrap'
import { createRouter } from './http/router'
import { parseJSON, sseResponse, jsonResponse, errorResponse, corsResponse } from './http/adapters'
import {
  invalidUrl,
  videoHasNoSubtitle,
  subtitleFetchFailed,
  sessionNotFound,
  chapterNotFound,
  geminiError,
  AppError,
} from './http/errors'

export { Env }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse()
    }

    const services = bootstrap(env)
    const router = createRouter()

    // POST /create
    router.add('POST', '/create', async (req) => {
      try {
        const body = await parseJSON<{ url: string; requirements?: string }>(req)
        if (!body.url) return errorResponse(invalidUrl())
        const stream = await services.createSession(body)
        return sseResponse(stream)
      } catch (err) {
        return mapError(err)
      }
    })

    // POST /continue
    router.add('POST', '/continue', async (req) => {
      try {
        const body = await parseJSON<{ sessionId: string }>(req)
        const stream = await services.continueSession(body)
        return sseResponse(stream)
      } catch (err) {
        return mapError(err)
      }
    })

    // POST /chapter-analysis
    router.add('POST', '/chapter-analysis', async (req) => {
      try {
        const body = await parseJSON<{ sessionId: string; chapterIndex: number }>(req)
        const analysis = await services.getChapterAnalysis(body)
        return jsonResponse(analysis)
      } catch (err) {
        return mapError(err)
      }
    })

    // GET /session/:id
    router.add('GET', '/session/:id', async (_req, id) => {
      try {
        const session = await services.getSession(id)
        if (!session) return errorResponse(sessionNotFound())
        return jsonResponse(session)
      } catch (err) {
        return mapError(err)
      }
    })

    const response = await router.handle(request)
    if (response) return response

    return jsonResponse({ error: 'NOT_FOUND', message: 'Route not found' }, 404)
  },
}

function mapError(err: unknown): Response {
  if (err instanceof AppError) return errorResponse(err)
  const message = err instanceof Error ? err.message : 'Internal error'

  switch (message) {
    case 'INVALID_URL': return errorResponse(invalidUrl())
    case 'VIDEO_HAS_NO_SUBTITLE': return errorResponse(videoHasNoSubtitle())
    case 'SUBTITLE_FETCH_FAILED': return errorResponse(subtitleFetchFailed())
    case 'SESSION_NOT_FOUND': return errorResponse(sessionNotFound())
    case 'CHAPTER_NOT_FOUND': return errorResponse(chapterNotFound())
    default: return errorResponse(geminiError(message))
  }
}
