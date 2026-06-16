import { BaseElement } from './components/base'
import './components/url-form'
import './components/stream-view'
import './components/chapter-card'
import { consumeSSE, StreamEvent } from './lib/stream'
import { createSession } from './lib/api'

class YtApp extends BaseElement {
  private streamView!: import('./components/stream-view').YtStreamView
  private urlForm!: import('./components/url-form').YtUrlForm
  private sessionId: string | null = null

  render(): void {
    this.html(`
      <div class="yt-app">
        <h1 style="text-align:center;margin-bottom:0.25rem;">YT Scribe</h1>
        <p style="text-align:center;color:var(--yt-text-secondary);margin-bottom:2rem;">
          YouTube 视频转深度对话文章
        </p>
        <yt-url-form></yt-url-form>
        <yt-stream-view></yt-stream-view>
      </div>
    `)

    this.urlForm = this.$('yt-url-form')!
    this.streamView = this.$('yt-stream-view')!
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('yt-submit', ((e: CustomEvent) => {
      this.handleSubmit(e.detail)
    }) as EventListener)
  }

  private async handleSubmit(params: { url: string; requirements?: string }): Promise<void> {
    this.streamView.show()

    try {
      const response = await createSession(params)

      if (!response.ok) {
        const err = await response.json() as any
        if (err.error === 'VIDEO_HAS_NO_SUBTITLE') {
          this.streamView.showNoSubtitle()
        } else {
          this.streamView.showError(err.message || '生成失败')
        }
        this.resetForm()
        return
      }

      const cancel = consumeSSE(response, (event: StreamEvent) => {
        switch (event.type) {
          case 'meta':
            this.sessionId = event.sessionId
            break
          case 'text':
            this.streamView.appendText(event.text)
            break
          case 'done':
            this.streamView.markComplete()
            this.resetForm()
            break
          case 'error':
            this.streamView.showError(event.message)
            this.resetForm()
            break
        }
      })
    } catch (err) {
      this.streamView.showError(err instanceof Error ? err.message : '网络错误')
      this.resetForm()
    }
  }

  private resetForm(): void {
    const btn = this.urlForm.$<HTMLButtonElement>('.yt-form__submit')
    if (btn) {
      btn.disabled = false
      btn.textContent = '生成文章'
    }
  }
}

customElements.define('yt-app', YtApp)
