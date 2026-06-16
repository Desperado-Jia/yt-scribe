import { BaseElement } from './base'
import { getChapterAnalysis } from '../lib/api'
import { HighlightMatch, applyHighlights } from '../lib/highlight'

export class YtChapterCard extends BaseElement {
  static get observedAttributes(): string[] {
    return ['title', 'index', 'session-id']
  }

  render(): void {
    const title = this.getAttribute('title') || 'Untitled'
    const index = this.getAttribute('index') || '0'

    this.html(`
      <div class="yt-chapter">
        <div class="yt-chapter__header">
          <h2 class="yt-chapter__title">${title}</h2>
          <button class="yt-chapter__analyze-btn" data-action="analyze">
            5W1H
          </button>
        </div>
        <div class="yt-chapter__content">
          <slot></slot>
        </div>
        <div class="yt-chapter__analysis" hidden></div>
      </div>
    `)

    this.on('[data-action="analyze"]', 'click', () => this.analyzeChapter())
  }

  private async analyzeChapter(): Promise<void> {
    const sessionId = this.getAttribute('session-id')
    const chapterIndex = parseInt(this.getAttribute('index') || '0')
    if (!sessionId) return

    const btn = this.$<HTMLButtonElement>('[data-action="analyze"]')!
    btn.disabled = true
    btn.textContent = '分析中...'

    try {
      const response = await getChapterAnalysis({ sessionId, chapterIndex })
      if (!response.ok) throw new Error('Analysis failed')

      const data = await response.json()

      // Render analysis panel
      const panel = this.$('.yt-chapter__analysis')!
      panel.innerHTML = createAnalysisHTML(data.summary)
      panel.hidden = false

      // Apply highlights
      const contentEl = this.$('.yt-chapter__content')!
      const matches = data.highlights as HighlightMatch[]
      applyHighlights(contentEl, matches)

      btn.textContent = '5W1H ✓'
    } catch {
      btn.textContent = '5W1H'
      btn.disabled = false
    }
  }
}

function createAnalysisHTML(summary: Record<string, string>): string {
  const labels: Record<string, string> = {
    who: 'Who · 谁',
    what: 'What · 什么',
    when: 'When · 何时',
    where: 'Where · 何地',
    why: 'Why · 为何',
    how: 'How · 如何',
  }

  const items = ['who', 'what', 'when', 'where', 'why', 'how']
    .map(
      (dim) => `
      <div class="yt-analysis__dim yt-analysis__dim--${dim}">
        <div class="yt-analysis__dim-label" style="color:var(--${dim}-color)">${labels[dim]}</div>
        <div class="yt-analysis__dim-text">${summary[dim] || '-'}</div>
      </div>
    `
    )
    .join('')

  return `<div class="yt-analysis__grid">${items}</div>`
}

customElements.define('yt-chapter-card', YtChapterCard)
