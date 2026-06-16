import { BaseElement } from './base'

export class YtUrlForm extends BaseElement {
  render(): void {
    this.html(`
      <form class="yt-form">
        <input
          type="url"
          class="yt-form__input"
          placeholder="输入 YouTube 视频链接..."
          required
          name="url"
        />
        <textarea
          class="yt-form__textarea"
          placeholder="生成要求（可选）：例如"用技术博客风格，面向初学者""
          name="requirements"
        ></textarea>
        <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem;">
          <button type="submit" class="yt-form__submit">
            生成文章
          </button>
          <span class="yt-form__hint" style="font-size:0.85rem;color:var(--yt-text-secondary);">
            生成时间约 30-60 秒
          </span>
        </div>
      </form>
    `)

    this.on('.yt-form', 'submit', (e) => {
      e.preventDefault()
      const urlInput = this.$<HTMLInputElement>('.yt-form__input')!
      const reqInput = this.$<HTMLTextAreaElement>('.yt-form__textarea')!
      const btn = this.$<HTMLButtonElement>('.yt-form__submit')!

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
    })
  }
}

customElements.define('yt-url-form', YtUrlForm)
