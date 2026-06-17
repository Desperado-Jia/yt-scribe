const API_BASE = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://yt-scribe-worker.cecilio-jia.workers.dev'

export interface CreateSessionParams {
  url: string
  requirements?: string
}

export interface ContinueSessionParams {
  sessionId: string
}

export interface ChapterAnalysisParams {
  sessionId: string
  chapterIndex: number
}

export async function createSession(params: CreateSessionParams): Promise<Response> {
  return fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function continueSession(params: ContinueSessionParams): Promise<Response> {
  return fetch(`${API_BASE}/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function getChapterAnalysis(params: ChapterAnalysisParams): Promise<Response> {
  return fetch(`${API_BASE}/chapter-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

export async function getSession(id: string): Promise<Response> {
  return fetch(`${API_BASE}/session/${id}`)
}
