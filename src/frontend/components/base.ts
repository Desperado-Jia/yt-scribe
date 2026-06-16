export class BaseElement extends HTMLElement {
  constructor() {
    super()
  }

  connectedCallback(): void {
    this.render()
  }

  render(): void {
    // Override in subclasses
  }

  protected html(template: string): void {
    this.innerHTML = template
  }

  public $<T extends HTMLElement>(selector: string): T | null {
    return this.querySelector(selector) as T | null
  }

  protected $$<T extends HTMLElement>(selector: string): NodeListOf<T> {
    return this.querySelectorAll(selector) as NodeListOf<T>
  }

  protected on<K extends keyof HTMLElementEventMap>(
    selector: string,
    event: K,
    handler: (e: HTMLElementEventMap[K]) => void
  ): void {
    this.addEventListener(event, (e) => {
      const target = e.target as HTMLElement
      if (target.matches(selector) || target.closest(selector)) {
        handler(e)
      }
    })
  }
}
