import { createGenerateClient, GenerateClientConfig } from './infra/generate'
import { createStore } from './infra/store'
import { createProxyTunnel, WebshareConfig } from './infra/proxy'
import { createVideoService } from './domain/video/video'
import { createArticleService } from './domain/article/article'
import { createAnalysisService } from './domain/analysis/analysis'
import { createSession } from './orchestration/create-session'
import { createContinueSession } from './orchestration/continue-session'
import { createGetChapterAnalysis } from './orchestration/get-chapter-analysis'

export interface Env {
  KV_STORE: KVNamespace
  GEMINI_API_KEY: string
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
  ANTHROPIC_BASE_URL?: string
  AI_PROVIDER?: string
  WEBSHARE_CONFIG?: string
  DEMO_VIDEO_ID: string
  SKIP_YOUTUBE_FETCH?: string
  MAX_CHARS?: string
}

export function bootstrap(env: Env) {
  // Infra
  const store = createStore(env.KV_STORE)
  const generateConfig: GenerateClientConfig =
    env.AI_PROVIDER === 'anthropic'
      ? {
          provider: 'anthropic',
          apiKey: env.ANTHROPIC_API_KEY || '',
          model: env.ANTHROPIC_MODEL,
          baseUrl: env.ANTHROPIC_BASE_URL,
        }
      : { provider: 'gemini', apiKey: env.GEMINI_API_KEY }
  const generate = createGenerateClient(generateConfig)

  let proxyConfig: WebshareConfig | undefined
  if (env.WEBSHARE_CONFIG) {
    const parsed = JSON.parse(env.WEBSHARE_CONFIG)
    proxyConfig = {
      host: parsed.host || 'proxy.webshare.io',
      port: parsed.port || 443,
      username: parsed.username || '',
      password: parsed.password || '',
    }
  }

  const proxy = createProxyTunnel(
    proxyConfig || { host: 'proxy.webshare.io', port: 443, username: '', password: '' }
  )

  // Domain
  const video = createVideoService({
    proxy,
    skipYoutubeFetch: env.SKIP_YOUTUBE_FETCH === 'true',
    maxChars: env.MAX_CHARS ? parseInt(env.MAX_CHARS) : 150000,
  })

  const article = createArticleService({ generate })
  const analysis = createAnalysisService({ generate })

  // Orchestration
  const createSessionFn = createSession({ video, article, store })
  return {
    createSession: createSessionFn,
    continueSession: createContinueSession({ article, store }),
    getChapterAnalysis: createGetChapterAnalysis({ analysis, store }),
    getSession: (id: string) => store.getSession(id),
  }
}
