import { BaseElement } from './base'
import { getChapterAnalysis } from '../lib/api'
import { HighlightMatch } from '../lib/highlight'

const DIMENSIONS = ['who', 'what', 'when', 'where', 'why', 'how'] as const

const LABELS: Record<string, string> = {
  who: 'WHO',
  what: 'WHAT',
  when: 'WHEN',
  where: 'WHERE',
  why: 'WHY',
  how: 'HOW',
}

export class YtChapterCard extends BaseElement {
  private chapterIndex = -1
  private sessionId = ''
  private loading = false

  render(): void {
    this.html(`
      <div class="w1h-card">
        <button class="w1h-close" data-action="close">✕</button>
        ${DIMENSIONS.map(
          (dim) => `
          <div class="w1h-cell cell-${dim}">
            <div class="w1h-label">${LABELS[dim]}</div>
            <div class="w1h-text">-</div>
          </div>
        `
        ).join('')}
      </div>
    `)

    this.on('[data-action="close"]', 'click', () => {
      this.hide()
    })
  }

  async show(sessionId: string, chapterIndex: number): Promise<void> {
    if (this.loading) return

    this.sessionId = sessionId
    this.chapterIndex = chapterIndex
    this.loading = true

    DIMENSIONS.forEach((dim) => {
      const cell = this.$(`.cell-${dim}`)!
      const text = cell.querySelector('.w1h-text')!
      text.textContent = '加载中...'
    })

    try {
      const response = await getChapterAnalysis({ sessionId, chapterIndex })
      if (!response.ok) {
        const body = await response.text()
        let errMsg = `${response.status} ${response.statusText}`
        try {
          const parsed = JSON.parse(body)
          errMsg = parsed.message || parsed.error || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      const data = await response.json() as {
        summary: Record<string, string>
        highlights: HighlightMatch[]
      }

      DIMENSIONS.forEach((dim) => {
        const cell = this.$(`.cell-${dim}`)!
        const text = cell.querySelector('.w1h-text')!
        text.textContent = data.summary[dim] || '-'
      })

      this.dispatchEvent(
        new CustomEvent('yt-highlights', {
          detail: { chapterIndex, highlights: data.highlights },
          bubbles: true,
        })
      )
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '获取失败'
      console.error('[5W1H] chapter analysis failed:', errMsg)
      DIMENSIONS.forEach((dim) => {
        const cell = this.$(`.cell-${dim}`)!
        const text = cell.querySelector('.w1h-text')!
        text.textContent = errMsg
      })
    } finally {
      this.loading = false
    }
  }

  hide(): void {
    this.dispatchEvent(new CustomEvent('yt-card-close', { bubbles: true }))
  }

  isVisible(): boolean {
    return true
  }

  getChapterIndex(): number {
    return this.chapterIndex
  }
}

customElements.define('yt-chapter-card', YtChapterCard)
