import { describe, it, expect, vi } from 'vitest'
import { createSession } from '../../src/backend/orchestration/create-session'
import { createContinueSession } from '../../src/backend/orchestration/continue-session'
import { createGetChapterAnalysis } from '../../src/backend/orchestration/get-chapter-analysis'
import { Store, ChapterAnalysisData } from '../../src/backend/infra/store'

// Use mock store and services for integration test
describe('Orchestration Integration', () => {
  it('createSession throws INVALID_URL for non-YouTube URL', async () => {
    const mockVideo = {
      parseVideoId: () => null,
      fetchSubtitles: vi.fn(),
      validate: vi.fn(),
    }
    const mockArticle = { generateStream: vi.fn(), continueStream: vi.fn(), parseChapters: vi.fn() }
    const mockStore = { getSession: vi.fn(), saveSession: vi.fn(), updateSession: vi.fn(), deleteSession: vi.fn(), getChapterAnalysis: vi.fn(), saveChapterAnalysis: vi.fn() }

    const handler = createSession({
      video: mockVideo as any,
      article: mockArticle as any,
      store: mockStore as any,
    })

    await expect(handler({ url: 'https://vimeo.com/123' })).rejects.toThrow('INVALID_URL')
  })

  it('getChapterAnalysis returns cached result when available', async () => {
    const cached: ChapterAnalysisData = {
      chapterIndex: 0,
      summary: { who: 'X', what: 'Y', when: 'Z', where: 'W', why: 'V', how: 'U' },
      highlights: [],
    }

    const mockStore = {
      getChapterAnalysis: vi.fn().mockResolvedValue(cached),
      getSession: vi.fn(),
      saveChapterAnalysis: vi.fn(),
    }
    const mockAnalysis = { analyzeChapter: vi.fn() }

    const handler = createGetChapterAnalysis({
      analysis: mockAnalysis as any,
      store: mockStore as any,
    })

    const result = await handler({ sessionId: 'abc', chapterIndex: 0 })
    expect(result).toEqual(cached)
    expect(mockAnalysis.analyzeChapter).not.toHaveBeenCalled()
  })
})
