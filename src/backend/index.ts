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

export type { Env }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
        const { stream, done } = await (services.createSession as any)(body)
        ctx.waitUntil(done)
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

    // GET /kv-large-test?size=100000
    router.add('GET', '/kv-large-test', async (req) => {
      const url = new URL(req.url)
      const size = parseInt(url.searchParams.get('size') || '50000')
      try {
        const key = 'test:large:json'
        const testObj = {
          article: 'x'.repeat(size),
          chapters: Array.from({ length: 10 }, (_, i) => ({
            index: i, title: `Chapter ${i}`, startOffset: i * 1000, endOffset: (i + 1) * 1000 - 1,
          })),
          status: 'complete',
          createdAt: Date.now(),
        }
        const json = JSON.stringify(testObj)
        console.log(`[kv-large-test] Putting ${json.length} bytes to KV`)
        await env.KV_STORE.put(key, json, { expirationTtl: 3600 })
        console.log(`[kv-large-test] Put done, reading back...`)
        const rawBack = await env.KV_STORE.get(key)
        console.log(`[kv-large-test] Raw get: ${rawBack?.length || 0} bytes`)
        let parsedOk = false
        try {
          const parsed = await env.KV_STORE.get(key, 'json')
          parsedOk = !!parsed
          console.log(`[kv-large-test] JSON parse: OK, article=${(parsed as any).article?.length}`)
        } catch (e: any) {
          console.error(`[kv-large-test] JSON parse FAILED: ${e.message}`)
        }
        return jsonResponse({ putSize: json.length, readBackLen: rawBack?.length || 0, parsedOk })
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500)
      }
    })

    // GET /kv-test (diagnostic)
    router.add('GET', '/kv-test', async () => {
      const results: any[] = []
      for (const [label, size] of [['1KB', 1000], ['10KB', 10000], ['100KB', 100000], ['200KB', 200000]] as const) {
        try {
          const key = `test:diag:${size}`
          const testData = JSON.stringify({ data: 'x'.repeat(size - 20), time: Date.now() })
          await env.KV_STORE.put(key, testData)
          const readBack = await env.KV_STORE.get(key)
          results.push({ label, writeSize: testData.length, readBackLen: readBack?.length || 0, ok: testData.length === (readBack?.length || 0) })
        } catch (err: any) {
          results.push({ label, error: err.message })
        }
      }
      return jsonResponse(results)
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
