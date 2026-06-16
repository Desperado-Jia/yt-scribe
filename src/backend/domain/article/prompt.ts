export function buildArticlePrompt(transcript: string, requirements?: string): string {
  let prompt = `你是一位专业的内容编辑。请基于以下 YouTube 视频的英文字幕，生成一篇结构清晰的中文对话体技术文章。

要求：
1. 使用对话体格式，让文章读起来像是一场深入对话
2. 使用 ## 标题划分章节，每个章节聚焦一个主题。章节标题必须使用描述性标题（如\"## AI 革命：我们处在第几局？\"），严格禁止使用\"Chapter X\"或\"第X章\"等序号式标题
3. 保留原文中的关键数据和引用
4. 文章应易于中文读者理解，必要时补充背景说明
5. 每个章节内容要充分展开，不少于 300 字
`

  if (requirements && requirements.trim()) {
    prompt += `\n用户特别要求：${requirements.trim()}\n`
  }

  prompt += `\n---\n字幕内容：\n\n${transcript}\n\n---\n\n请开始生成文章：`

  return prompt
}

export function buildChapterAnalysisPrompt(
  chapterTitle: string,
  chapterContent: string,
  globalContext: string
): string {
  return `你是一位内容分析专家。请对以下文章章节进行 5W1H 分析，并标注可高亮的维度关键词。

视频整体背景：
${globalContext}

章节标题：${chapterTitle}
章节内容：
${chapterContent}

请以 JSON 格式返回分析结果，包含：
1. summary: 六维度总结（who/what/when/where/why/how），每个维度用 1-2 句话
2. highlights: 维度的关键词及所在上下文锚点（contextAnchor），用于在原文中精确高亮

返回格式：
{
  "summary": {
    "who": "...",
    "what": "...",
    "when": "...",
    "where": "...",
    "why": "...",
    "how": "..."
  },
  "highlights": [
    { "dimension": "who", "phrase": "Elon Musk", "contextAnchor": "Elon Musk announced" },
    { "dimension": "what", "phrase": "AI revolution", "contextAnchor": "the AI revolution is" }
  ]
}`
}
