export interface ChapterMeta {
  index: number
  title: string
  startOffset: number
  endOffset: number
}

const CODE_FENCE = /```[\s\S]*?```/g

export function parseChapters(markdown: string): ChapterMeta[] {
  const codeBlocks: Array<{ original: string; length: number }> = []
  let placeholderIndex = 0
  const guarded = markdown.replace(CODE_FENCE, (match) => {
    const placeholder = `\x00CODEBLOCK${placeholderIndex}\x00`
    codeBlocks.push({ original: match, length: placeholder.length })
    placeholderIndex++
    return placeholder
  })

  const sectionRegex = /(?:^|\n)(?=##\s)/gm
  const rawSections = guarded.split(sectionRegex).filter(s => s.length > 0)

  if (rawSections.length === 0 || !guarded.includes('## ')) return []

  const chapters: ChapterMeta[] = []
  let cumulativeOffset = 0

  for (let i = 0; i < rawSections.length; i++) {
    let restoredSection = rawSections[i]
    if (restoredSection.startsWith('\n')) {
      restoredSection = restoredSection.slice(1)
    }

    codeBlocks.forEach((block, idx) => {
      restoredSection = restoredSection.replace(`\x00CODEBLOCK${idx}\x00`, block.original)
    })

    const titleMatch = restoredSection.match(/^##\s+(.+?)(?:\n|$)/)
    const title = titleMatch ? titleMatch[1].trim() : `Section ${i + 1}`
    const length = restoredSection.length

    chapters.push({
      index: i,
      title,
      startOffset: cumulativeOffset,
      endOffset: cumulativeOffset + length,
    })

    cumulativeOffset += length
    if (i < rawSections.length - 1) {
      cumulativeOffset += 1
    }
  }

  return chapters
}
