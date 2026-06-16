import { describe, it, expect } from 'vitest'
import { buildArticlePrompt, buildChapterAnalysisPrompt } from '../../../src/backend/domain/article/prompt'

describe('buildArticlePrompt', () => {
  it('includes transcript in the prompt', () => {
    const prompt = buildArticlePrompt('Hello world transcript', undefined)
    expect(prompt).toContain('Hello world transcript')
  })

  it('includes system instruction for Chinese article generation', () => {
    const prompt = buildArticlePrompt('Test transcript', undefined)
    expect(prompt).toContain('中文')
    expect(prompt).toContain('对话')
  })

  it('incorporates user requirements when provided', () => {
    const prompt = buildArticlePrompt('Test transcript', 'make it very technical')
    expect(prompt).toContain('make it very technical')
  })

  it('handles empty requirements gracefully', () => {
    const prompt = buildArticlePrompt('Test transcript', '')
    expect(prompt).toBeTruthy()
  })
})

describe('buildChapterAnalysisPrompt', () => {
  it('includes chapter title and content', () => {
    const prompt = buildChapterAnalysisPrompt(
      'AI Revolution',
      'Content about AI revolution...',
      'Global context: video about technology'
    )
    expect(prompt).toContain('AI Revolution')
    expect(prompt).toContain('Content about AI revolution...')
    expect(prompt).toContain('Global context: video about technology')
  })

  it('includes 5W1H dimensions', () => {
    const prompt = buildChapterAnalysisPrompt('Title', 'Content', 'Context')
    expect(prompt).toContain('who')
    expect(prompt).toContain('what')
    expect(prompt).toContain('when')
    expect(prompt).toContain('where')
    expect(prompt).toContain('why')
    expect(prompt).toContain('how')
  })
})
