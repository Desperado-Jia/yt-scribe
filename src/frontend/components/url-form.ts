import { BaseElement } from './base'

export class YtUrlForm extends BaseElement {
  render(): void {
    this.html(`
      <div class="home-col">
        <div class="home-logo">YT Scribe</div>
        <div class="home-sub">YouTube 视频转深度文章 · AI 驱动</div>
        <div class="home-spacer"></div>
        <input
          class="home-input"
          type="text"
          placeholder="粘贴 YouTube 链接..."
          name="url"
        />
        <div class="home-pref" data-action="toggle-pref">
          偏好（可选） ▸
          <textarea
            class="home-pref-textarea"
            placeholder="用自然语言描述你想要的风格、角度、深度"
            name="requirements"
          ></textarea>
          <div class="home-pref-hint">用自然语言描述你想要的风格、角度、深度</div>
        </div>
        <button class="home-btn" data-action="submit">生成文章</button>
        <div class="home-examples">示例：Andrej Karpathy · Lex Fridman · Paul Graham</div>
      </div>
    `)

    this.on('[data-action="toggle-pref"]', 'click', (e) => {
      // Don't toggle when clicking the textarea itself
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      const pref = this.$('.home-pref')!
      pref.classList.toggle('open')
    })

    this.on('[data-action="submit"]', 'click', () => {
      this.submit()
    })

    this.on('.home-input', 'keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        this.submit()
      }
    })
  }

  private submit(): void {
    const urlInput = this.$<HTMLInputElement>('.home-input')!
    const reqInput = this.$<HTMLTextAreaElement>('.home-pref-textarea')!
    const btn = this.$<HTMLButtonElement>('.home-btn')!

    if (!urlInput.value.trim()) return

    btn.disabled = true
    btn.textContent = '生成中...'

    this.dispatchEvent(
      new CustomEvent('yt-submit', {
        detail: {
          url: urlInput.value.trim(),
          requirements: reqInput.value.trim() || undefined,
        },
        bubbles: true,
      })
    )
  }

  enable(): void {
    const btn = this.$<HTMLButtonElement>('.home-btn')!
    if (btn) {
      btn.disabled = false
      btn.textContent = '生成文章'
    }
  }
}

customElements.define('yt-url-form', YtUrlForm)
