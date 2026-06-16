import { BaseElement } from './base'
import { renderMarkdown } from '../lib/markdown'

export class YtStreamView extends BaseElement {
  private chapters: Array<{ el: HTMLElement; title: string }> = []
  private currentChapterEl: HTMLElement | null = null
  private markdownBuffer = ''
  private articleContainer!: HTMLElement

  render(): void {
    this.html(`
      <div class="yt-stream" hidden>
        <div class="yt-stream__loading">正在生成文章...</div>
        <div class="yt-stream__article"></div>
        <div class="yt-stream__continue" hidden>
          <button class="yt-continue">⚠️ 生成中断 · 点击续写</button>
        </div>
      </div>
    `)
    this.articleContainer = this.$('.yt-stream__article')!
  }

  show(): void {
    this.$('.yt-stream')!.hidden = false
  }

  appendText(text: string): void {
    this.markdownBuffer += text

    // RAF-throttled render
    requestAnimationFrame(() => {
      const fragment = renderMarkdown(this.markdownBuffer)
      this.articleContainer.textContent = ''
      this.articleContainer.appendChild(fragment)

      // Detect chapters
      const h2s = this.articleContainer.querySelectorAll('h2')
      if (h2s.length > this.chapters.length) {
        for (let i = this.chapters.length; i < h2s.length; i++) {
          this.chapters.push({ el: h2s[i], title: h2s[i].textContent || '' })
        }
      }
    })
  }

  markComplete(): void {
    const loading = this.$('.yt-stream__loading')
    if (loading) loading.hidden = true
  }

  showContinueButton(): void {
    this.$('.yt-stream__continue')!.hidden = false
  }

  hideContinueButton(): void {
    this.$('.yt-stream__continue')!.hidden = true
  }

  showError(message: string): void {
    this.articleContainer.innerHTML = `<div class="yt-error">${message}</div>`
    const loading = this.$('.yt-stream__loading')
    if (loading) loading.hidden = true
  }

  showNoSubtitle(): void {
    const loading = this.$('.yt-stream__loading')
    if (loading) loading.hidden = true
    this.articleContainer.innerHTML = `
      <div class="yt-no-subtitle">
        <div class="yt-no-subtitle__icon">📺</div>
        <div class="yt-no-subtitle__title">该视频没有可用字幕</div>
        <div class="yt-no-subtitle__text">
          可能是因为语言不支持、创作者未上传字幕等原因。
          请尝试另一个 YouTube 视频，或使用演示视频体验完整功能。
        </div>
      </div>
    `
  }
}

customElements.define('yt-stream-view', YtStreamView)
