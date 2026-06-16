import { BaseElement } from './components/base'
import './components/url-form'
import './components/stream-view'
import './components/chapter-card'
import { consumeSSE, StreamEvent } from './lib/stream'
import { createSession, continueSession } from './lib/api'

class YtApp extends BaseElement {
  private homePage!: HTMLElement
  private articlePage!: HTMLElement
  private urlForm!: import('./components/url-form').YtUrlForm
  private streamView!: import('./components/stream-view').YtStreamView
  private sessionId: string | null = null

  render(): void {
    this.html(`
      <div class="home-page" id="home-page">
        <yt-url-form></yt-url-form>
      </div>
      <div class="article-page" id="article-page" hidden>
        <yt-stream-view></yt-stream-view>
      </div>
    `)

    this.homePage = this.$('#home-page')!
    this.articlePage = this.$('#article-page')!
    this.urlForm = this.$('yt-url-form')!
    this.streamView = this.$('yt-stream-view')!
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('yt-submit', ((e: CustomEvent) => {
      this.handleSubmit(e.detail)
    }) as EventListener)
    this.addEventListener('yt-back', () => {
      this.showHome()
    })
    this.addEventListener('yt-continue', () => {
      this.handleContinue()
    })
  }

  private showArticle(): void {
    this.homePage.hidden = true
    this.articlePage.hidden = false
    window.scrollTo(0, 0)
  }

  private showHome(): void {
    this.articlePage.hidden = true
    this.homePage.hidden = false
    this.streamView.reset()
    this.sessionId = null
    window.scrollTo(0, 0)
  }

  private async handleSubmit(params: { url: string; requirements?: string }): Promise<void> {
    this.showArticle()
    this.streamView.showLoading('正在获取视频字幕...')

    try {
      const response = await createSession(params)

      if (!response.ok) {
        const err = await response.json() as any
        if (err.error === 'VIDEO_HAS_NO_SUBTITLE') {
          this.streamView.showNoSubtitle()
        } else {
          this.streamView.showError(err.message || '生成失败', () => this.showHome())
        }
        return
      }

      consumeSSE(response, (event: StreamEvent) => {
        switch (event.type) {
          case 'meta':
            this.sessionId = event.sessionId
            this.streamView.setSessionId(event.sessionId)
            break
          case 'text':
            this.streamView.appendText(event.text)
            break
          case 'done':
            this.streamView.markComplete()
            break
          case 'error':
            this.streamView.showError(event.message, () => this.showHome())
            break
        }
      })
    } catch (err) {
      this.streamView.showError(
        err instanceof Error ? err.message : '网络错误',
        () => this.showHome()
      )
    }
  }

  private async handleContinue(): Promise<void> {
    if (!this.sessionId) return
    this.streamView.hideContinueButton()

    try {
      const response = await continueSession({ sessionId: this.sessionId })

      if (!response.ok) {
        const err = await response.json() as any
        this.streamView.showError(err.message || '续写失败', () => {})
        return
      }

      consumeSSE(response, (event: StreamEvent) => {
        switch (event.type) {
          case 'text':
            this.streamView.appendText(event.text)
            break
          case 'done':
            this.streamView.markComplete()
            break
          case 'error':
            this.streamView.showError(event.message, () => {})
            break
        }
      })
    } catch (err) {
      this.streamView.showError(
        err instanceof Error ? err.message : '网络错误',
        () => {}
      )
    }
  }
}

customElements.define('yt-app', YtApp)
