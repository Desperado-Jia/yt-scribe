import { describe, it, expect, vi } from 'vitest'
import { createAnalysisService, AnalysisService } from '../../../src/backend/domain/analysis/analysis'
import { GenerateClient } from '../../../src/backend/infra/generate'

describe('createAnalysisService', () => {
  it('returns an AnalysisService with analyzeChapter method', () => {
    const mockGenerate: GenerateClient = {
      generateStream: vi.fn(),
    }
    const service = createAnalysisService({ generate: mockGenerate })
    expect(service).toHaveProperty('analyzeChapter')
    expect(typeof service.analyzeChapter).toBe('function')
  })
})
