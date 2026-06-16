import { marked } from 'marked'

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'em', 'strong', 'del', 'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
])

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel'])

export function renderMarkdown(md: string): DocumentFragment {
  marked.setOptions({ breaks: true, gfm: true })

  const raw = marked.parse(md, { async: false }) as string
  const parser = new DOMParser()
  const doc = parser.parseFromString(raw, 'text/html')

  const fragment = document.createDocumentFragment()
  sanitizeAndAppend(doc.body, fragment)
  return fragment
}

function sanitizeAndAppend(source: Node, target: DocumentFragment | HTMLElement): void {
  for (const child of Array.from(source.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(child.textContent || ''))
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const el = child as Element
    if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) {
      // Flatten children into target
      sanitizeAndAppend(el, target)
      continue
    }

    const newEl = document.createElement(el.tagName.toLowerCase())

    // Copy allowed attributes
    for (const attr of Array.from(el.attributes)) {
      if (ALLOWED_ATTRS.has(attr.name)) {
        newEl.setAttribute(attr.name, attr.value)
      }
    }

    // Add target="_blank" and rel="noopener" for links
    if (el.tagName.toLowerCase() === 'a') {
      newEl.setAttribute('target', '_blank')
      newEl.setAttribute('rel', 'noopener noreferrer')
    }

    sanitizeAndAppend(el, newEl)
    target.appendChild(newEl)
  }
}
