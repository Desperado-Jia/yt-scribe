export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return { error: this.code, message: this.message }
  }
}

export function invalidUrl(): AppError {
  return new AppError('INVALID_URL', 400, '不是有效的 YouTube 链接')
}

export function videoHasNoSubtitle(): AppError {
  return new AppError('VIDEO_HAS_NO_SUBTITLE', 422, '该视频没有可用的字幕')
}

export function subtitleFetchFailed(): AppError {
  return new AppError('SUBTITLE_FETCH_FAILED', 503, '字幕获取失败，请稍后重试')
}

export function sessionNotFound(): AppError {
  return new AppError('SESSION_NOT_FOUND', 404, '会话不存在或已过期')
}

export function chapterNotFound(): AppError {
  return new AppError('CHAPTER_NOT_FOUND', 404, '章节不存在')
}

export function geminiError(detail: string): AppError {
  return new AppError('GEMINI_API_ERROR', 502, detail)
}
