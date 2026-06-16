import { BaseElement } from './base'
import { renderMarkdown } from '../lib/markdown'
import { applyHighlights } from '../lib/highlight'

interface ChapterInfo {
  title: string
}

export class YtStreamView extends BaseElement {
  private chapters: ChapterInfo[] = []
  private markdownBuffer = ''
  private articleBody!: HTMLElement
  private chapterStrip!: HTMLElement
  private progressBar!: HTMLElement
  private loadingState!: HTMLElement
  private continueCard!: HTMLElement
  private errorCard!: HTMLElement
  private endDivider!: HTMLElement
  private sessionId: string | null = null
  private activeChapterIdx = -1
  private activeCard: import('./chapter-card').YtChapterCard | null = null
  private renderPending = false

  render(): void {
    this.html(`
      <!-- Topbar -->
      <div class="topbar">
        <div class="topbar-row1">
          <button class="topbar-back" data-action="back">← 返回</button>
          <div class="topbar-progress" id="progress-bar" hidden>
            <div class="topbar-progress-bar"></div>
          </div>
          <div class="topbar-spacer"></div>
        </div>
        <div class="topbar-row2" id="chapter-strip"></div>
      </div>

      <!-- Loading -->
      <div class="article-loading" id="loading-state">
        <div class="mini-progress"><div class="mini-progress-bar"></div></div>
        <p class="article-loading-text" id="loading-text">正在获取视频字幕...</p>
      </div>

      <!-- Error -->
      <div class="error-card" id="error-card" hidden>
        <div class="error-dot"></div>
        <div class="error-title" id="error-title"></div>
        <div class="error-desc" id="error-desc"></div>
        <button class="error-link" id="error-action"></button>
      </div>

      <!-- Article Body -->
      <div class="article-body" id="article-body"></div>

      <!-- End Divider -->
      <div class="end-divider" id="end-divider" hidden>
        <span class="end-divider-dot"></span>
        <span class="end-divider-line"></span>
        <span class="end-divider-dot"></span>
      </div>

      <!-- Resume Card -->
      <div class="resume-card" id="continue-card" hidden>
        <div class="resume-title">生成中断</div>
        <button class="resume-link" data-action="continue">点击续写</button>
      </div>
    `)

    this.articleBody = this.$('#article-body')!
    this.chapterStrip = this.$('#chapter-strip')!
    this.progressBar = this.$('#progress-bar')!
    this.loadingState = this.$('#loading-state')!
    this.continueCard = this.$('#continue-card')!
    this.errorCard = this.$('#error-card')!
    this.endDivider = this.$('#end-divider')!

    this.on('[data-action="back"]', 'click', () => {
      this.dispatchEvent(new CustomEvent('yt-back', { bubbles: true }))
    })

    this.on('[data-action="continue"]', 'click', () => {
      this.dispatchEvent(new CustomEvent('yt-continue', { bubbles: true }))
    })

    // Delegate chapter chip clicks
    this.on('.chapter-chip', 'click', (e) => {
      const chip = (e.target as HTMLElement).closest('.chapter-chip') as HTMLElement
      if (!chip) return
      const idx = parseInt(chip.dataset.index || '-1')
      if (idx >= 0 && idx < this.chapters.length) {
        const h2 = this.articleBody.querySelectorAll('h2')[idx]
        if (h2) h2.scrollIntoView({ behavior: 'smooth', block: 'start' })
        this.setActiveChip(idx)
      }
    })

    // Delegate 5W1H toggle clicks
    this.on('.w1h-toggle', 'click', (e) => {
      const btn = (e.target as HTMLElement).closest('.w1h-toggle') as HTMLElement
      if (!btn || !this.sessionId) return
      const chapterIdx = parseInt(btn.dataset.chapter || '-1')
      if (chapterIdx < 0) return

      // If same chapter card is already open, remove it
      if (this.activeCard && this.activeCard.getChapterIndex() === chapterIdx) {
        this.activeCard.remove()
        this.activeCard = null
        return
      }

      // Remove any existing card
      if (this.activeCard) {
        this.activeCard.remove()
      }

      // Create new card and insert after chapter's first paragraph
      const card = document.createElement('yt-chapter-card') as import('./chapter-card').YtChapterCard
      const h2 = this.articleBody.querySelectorAll('h2')[chapterIdx]
      if (!h2) return
      const nextP = h2.nextElementSibling
      const insertAfter = nextP || h2
      const parent = insertAfter.parentNode
      if (!parent) return
      parent.insertBefore(card, insertAfter.nextSibling)

      this.activeCard = card
      card.show(this.sessionId, chapterIdx)
    })

    // Listen for card close events
    this.addEventListener('yt-card-close', () => {
      if (this.activeCard) {
        this.activeCard.remove()
        this.activeCard = null
      }
    })

    // Listen for highlight application
    this.addEventListener('yt-highlights', ((e: CustomEvent) => {
      const { chapterIndex, highlights } = e.detail
      if (chapterIndex >= 0 && chapterIndex < this.chapters.length) {
        const h2 = this.articleBody.querySelectorAll('h2')[chapterIndex]
        if (h2 && h2.parentElement) {
          applyHighlights(h2.parentElement, highlights)
        }
      }
    }) as EventListener)
  }

  reset(): void {
    this.markdownBuffer = ''
    this.chapters = []
    this.activeChapterIdx = -1
    this.sessionId = null
    this.articleBody.innerHTML = ''
    this.chapterStrip.innerHTML = ''
    this.loadingState.hidden = false
    this.continueCard.hidden = true
    this.errorCard.hidden = true
    this.endDivider.hidden = true
    this.progressBar.hidden = true
    const loadingText = this.$('#loading-text')
    if (loadingText) loadingText.textContent = '正在获取视频字幕...'
    if (this.activeCard) {
      this.activeCard.remove()
      this.activeCard = null
    }
  }

  setSessionId(id: string): void {
    this.sessionId = id
  }

  showLoading(text: string): void {
    this.loadingState.hidden = false
    this.articleBody.innerHTML = ''
    const loadingText = this.$('#loading-text')
    if (loadingText) loadingText.textContent = text
  }

  appendText(text: string): void {
    if (!this.markdownBuffer) {
      this.loadingState.hidden = true
      this.progressBar.hidden = false
    }

    this.markdownBuffer += text

    // Detect complete chapter headings from raw markdown (title required, ended by newline)
    this.detectChaptersInRaw()

    if (this.renderPending) return
    this.renderPending = true
    requestAnimationFrame(() => {
      this.renderPending = false
      const fragment = renderMarkdown(this.markdownBuffer)
      this.articleBody.textContent = ''
      this.articleBody.appendChild(fragment)

      // Re-attach 5W1H buttons to current DOM elements
      const h2s = this.articleBody.querySelectorAll('h2')
      h2s.forEach((h2, i) => {
        if (!h2.querySelector('.w1h-toggle')) {
          const btn = document.createElement('button')
          btn.className = 'w1h-toggle'
          btn.dataset.chapter = String(i)
          btn.textContent = '[5W1H ▾]'
          h2.appendChild(btn)
        }
      })
    })
  }

  // Detect chapters from raw markdown — only complete ## heading lines (ended by \n)
  private detectChaptersInRaw(): void {
    const headingRegex = /^## (.+)$/gm
    let match: RegExpExecArray | null
    const found: string[] = []
    while ((match = headingRegex.exec(this.markdownBuffer)) !== null) {
      found.push(match[1].trim())
    }
    if (found.length <= this.chapters.length) return

    for (let i = this.chapters.length; i < found.length; i++) {
      const title = found[i]
      this.chapters.push({ title })

      const chip = document.createElement('button')
      chip.className = 'chapter-chip'
      chip.dataset.index = String(i)
      const shortTitle = title.length > 20 ? title.slice(0, 20) + '...' : title
      chip.textContent = shortTitle
      this.chapterStrip.appendChild(chip)
    }
    this.setActiveChip(this.chapters.length - 1)
  }

  markComplete(): void {
    this.progressBar.hidden = true
    this.endDivider.hidden = false
    this.loadingState.hidden = true
  }

  showContinueButton(): void {
    this.continueCard.hidden = false
  }

  hideContinueButton(): void {
    this.continueCard.hidden = true
  }

  showError(message: string, onAction: () => void): void {
    this.loadingState.hidden = true
    this.progressBar.hidden = true
    this.articleBody.innerHTML = ''
    this.errorCard.hidden = false

    const title = this.$('#error-title')!
    const desc = this.$('#error-desc')!
    const action = this.$('#error-action')!

    title.textContent = '出错了'
    desc.textContent = message
    action.textContent = '重新开始'
    action.onclick = onAction
  }

  showNoSubtitle(): void {
    this.loadingState.hidden = true
    this.progressBar.hidden = true
    this.articleBody.innerHTML = ''
    this.errorCard.hidden = false

    const title = this.$('#error-title')!
    const desc = this.$('#error-desc')!
    const action = this.$('#error-action')!

    title.textContent = '该视频暂无字幕'
    desc.textContent = '我们尝试获取了，但该视频没有可用的字幕源。'
    action.textContent = '试试其他链接'
    action.onclick = () => {
      this.dispatchEvent(new CustomEvent('yt-back', { bubbles: true }))
    }
  }

  private setActiveChip(idx: number): void {
    if (this.activeChapterIdx === idx) return
    this.activeChapterIdx = idx
    const chips = this.chapterStrip.querySelectorAll('.chapter-chip')
    chips.forEach((c, i) => {
      c.classList.toggle('current', i === idx)
    })
  }
}

customElements.define('yt-stream-view', YtStreamView)
