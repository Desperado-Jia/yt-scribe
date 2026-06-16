import { describe, it, expect, beforeEach } from 'vitest'
import { createStore, Store, SessionData } from '../../../src/backend/infra/store'

function createMockKV(): KVNamespace {
  const data = new Map<string, string>()
  return {
    get: (key: string, type?: string) => {
      const value = data.get(key)
      if (value == null) return Promise.resolve(null)
      if (type === 'json') return Promise.resolve(JSON.parse(value))
      return Promise.resolve(value)
    },
    put: (key: string, value: string) => { data.set(key, value); return Promise.resolve() },
    delete: (key: string) => { data.delete(key); return Promise.resolve() },
    list: () => Promise.resolve({ keys: [], list_complete: true }),
    getWithMetadata: (key: string) => {
      const value = data.get(key)
      return Promise.resolve({ value: value ?? null, metadata: null })
    },
  } as unknown as KVNamespace
}

describe('createStore', () => {
  let store: Store
  let kv: KVNamespace

  const sampleSession: SessionData = {
    videoUrl: 'https://youtube.com/watch?v=abc123',
    requirements: 'be concise',
    transcript: 'full transcript text',
    article: '# Chapter 1\n\nContent here',
    chapters: [{ index: 0, title: 'Chapter 1', startOffset: 0, endOffset: 25 }],
    createdAt: Date.now(),
    status: 'complete',
  }

  beforeEach(() => {
    kv = createMockKV()
    store = createStore(kv)
  })

  it('saves and retrieves a session', async () => {
    await store.saveSession('abc-123', sampleSession)
    const result = await store.getSession('abc-123')
    expect(result).toEqual(sampleSession)
  })

  it('returns null for non-existent session', async () => {
    const result = await store.getSession('nonexistent')
    expect(result).toBeNull()
  })

  it('updates a session partially', async () => {
    await store.saveSession('abc-123', sampleSession)
    await store.updateSession('abc-123', { status: 'failed' })
    const result = await store.getSession('abc-123')
    expect(result!.status).toBe('failed')
    expect(result!.article).toBe(sampleSession.article)
  })

  it('updateSession is no-op for non-existent session', async () => {
    await store.updateSession('nonexistent', { status: 'complete' })
    const result = await store.getSession('nonexistent')
    expect(result).toBeNull()
  })

  it('deletes a session', async () => {
    await store.saveSession('abc-123', sampleSession)
    await store.deleteSession('abc-123')
    const result = await store.getSession('abc-123')
    expect(result).toBeNull()
  })

  it('saves chapter analysis to separate key', async () => {
    const analysis = {
      chapterIndex: 0,
      summary: { who: 'A', what: 'B', when: 'C', where: 'D', why: 'E', how: 'F' },
      highlights: [],
    }
    await store.saveChapterAnalysis('abc-123', 0, analysis as any)
    const result = await store.getChapterAnalysis('abc-123', 0)
    expect(result).toEqual(analysis)
  })

  it('getChapterAnalysis returns null when no cached analysis', async () => {
    const result = await store.getChapterAnalysis('abc-123', 0)
    expect(result).toBeNull()
  })
})
