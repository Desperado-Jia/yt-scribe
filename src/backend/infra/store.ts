export interface ChapterMeta {
  index: number
  title: string
  startOffset: number
  endOffset: number
}

export interface SessionData {
  videoUrl: string
  videoTitle?: string
  requirements?: string
  transcript: string
  article: string
  chapters: ChapterMeta[]
  createdAt: number
  status: 'generating' | 'complete' | 'failed'
}

export interface ChapterAnalysisData {
  chapterIndex: number
  summary: {
    who: string
    what: string
    when: string
    where: string
    why: string
    how: string
  }
  highlights: Array<{
    dimension: 'who' | 'what' | 'when' | 'where' | 'why' | 'how'
    phrase: string
    contextAnchor: string
  }>
}

const SESSION_KEY = (id: string) => `session:${id}`
const ANALYSIS_KEY = (sessionId: string, chapterIndex: number) =>
  `session:${sessionId}:chapter-analysis:${chapterIndex}`

const SESSION_TTL = 60 * 60 * 24 * 7 // 7 days in seconds

export interface Store {
  getSession(id: string): Promise<SessionData | null>
  saveSession(id: string, data: SessionData): Promise<void>
  updateSession(id: string, patch: Partial<SessionData>): Promise<void>
  deleteSession(id: string): Promise<void>
  getChapterAnalysis(sessionId: string, chapterIndex: number): Promise<ChapterAnalysisData | null>
  saveChapterAnalysis(sessionId: string, chapterIndex: number, data: ChapterAnalysisData): Promise<void>
}

export function createStore(ns: KVNamespace): Store {
  return {
    async getSession(id: string): Promise<SessionData | null> {
      const raw = await ns.get(SESSION_KEY(id), 'json')
      return raw as SessionData | null
    },

    async saveSession(id: string, data: SessionData): Promise<void> {
      await ns.put(SESSION_KEY(id), JSON.stringify(data), { expirationTtl: SESSION_TTL })
    },

    async updateSession(id: string, patch: Partial<SessionData>): Promise<void> {
      const existing = await ns.get(SESSION_KEY(id), 'json') as SessionData | null
      if (!existing) return
      const updated = { ...existing, ...patch }
      await ns.put(SESSION_KEY(id), JSON.stringify(updated), { expirationTtl: SESSION_TTL })
    },

    async deleteSession(id: string): Promise<void> {
      await ns.delete(SESSION_KEY(id))
    },

    async getChapterAnalysis(sessionId: string, chapterIndex: number): Promise<ChapterAnalysisData | null> {
      const raw = await ns.get(ANALYSIS_KEY(sessionId, chapterIndex), 'json')
      return raw as ChapterAnalysisData | null
    },

    async saveChapterAnalysis(sessionId: string, chapterIndex: number, data: ChapterAnalysisData): Promise<void> {
      await ns.put(ANALYSIS_KEY(sessionId, chapterIndex), JSON.stringify(data), { expirationTtl: SESSION_TTL })
    },
  }
}
