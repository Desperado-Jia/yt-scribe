export interface HighlightMatch {
  startIndex: number
  endIndex: number
  dimension: 'who' | 'what' | 'when' | 'where' | 'why' | 'how'
  phrase: string
}

const DIMENSION_CLASS: Record<string, string> = {
  who: 'hl-who',
  what: 'hl-what',
  when: 'hl-when',
  where: 'hl-where',
  why: 'hl-why',
  how: 'hl-how',
}

export function applyHighlights(container: HTMLElement, matches: HighlightMatch[]): void {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Text | null

  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node)
  }

  // Build text->node index
  const nodeMap: Array<{ node: Text; start: number; end: number }> = []
  let offset = 0
  for (const textNode of textNodes) {
    const len = textNode.textContent?.length || 0
    nodeMap.push({ node: textNode, start: offset, end: offset + len })
    offset += len
  }

  // Sort matches by startIndex for sequential processing
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex)

  for (const match of sorted) {
    // Find which text node contains this match
    for (const entry of nodeMap) {
      if (match.startIndex >= entry.start && match.endIndex <= entry.end) {
        const localStart = match.startIndex - entry.start
        const localEnd = match.endIndex - entry.start
        const text = entry.node.textContent || ''

        if (localStart >= 0 && localEnd <= text.length) {
          const mark = document.createElement('mark')
          mark.className = DIMENSION_CLASS[match.dimension]
          mark.dataset.dim = match.dimension
          mark.textContent = text.slice(localStart, localEnd)

          const after = entry.node.splitText(localStart)
          after.splitText(localEnd - localStart)
          after.parentNode?.replaceChild(mark, after)

          // Update node map entries for remaining nodes
          break
        }
      }
    }
  }
}
