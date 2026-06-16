# YT Scribe

YouTube 视频 → 中文深度文章 + 章节级 5W1H 分析。

基于 Cloudflare Workers 的全栈 AI 应用，输入 YouTube 链接即可生成结构清晰的中文对话体文章，支持流式输出、章节分析和魔术高亮交互。

> **注意事项**
>
> - **AI 模型**：Gemini API 在国内被墙，当前实际使用的是 Claude Code 内置的 DeepSeek V4 Pro 模型，通过 Anthropic 兼容协议调用。可通过 `AI_PROVIDER` 环境变量在 Gemini / Anthropic 之间切换。
> - **网络限制**：由于国内防火墙及代理不稳定，YouTube 字幕抓取可能间歇性失败。本地开发建议开启 `SKIP_YOUTUBE_FETCH=true` 使用硬编码字幕兜底，或配置 [Webshare](https://webshare.io) 代理通过 TCP Socket 隧道穿透。

## 架构

```
┌─── Cloudflare Pages ───┐     ┌─── Cloudflare Worker ───┐
│  TypeScript SPA         │     │  Domain-Oriented Arch    │
│  Web Components         │     │  video/ → article/       │
│  0KB runtime deps       │     │         → analysis/      │
└─────────────────────────┘     │  + proxy tunnel          │
                                └───────────┬──────────────┘
                                            │
                                        ┌───▼───┐
                                        │  KV   │
                                        └───────┘
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | TypeScript + Web Components + Vite |
| 后端 | Cloudflare Workers |
| 存储 | Cloudflare KV |
| AI | DeepSeek v4 Pro / Gemini 2.5 Flash（可切换） |
| 测试 | Vitest |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入 API Keys

# 3. 构建 Worker
npm run build:worker

# 4. 启动后端 (端口 8787)
npx wrangler dev

# 5. 启动前端 (端口 5173)
npx vite
```

## 实现说明

### 1. 如何获取和处理 YouTube 字幕

采用**三层降级策略**：

- **硬编码兜底**：启动时将预设字幕打包进 `hardcoded-subtitles-map.gen`，零网络请求直接命中
- **多客户端直连 YouTube**：依次尝试 Web Client → ANDROID Client → MWEB Client 三种 InnerTube API 客户端身份，提取 `playerCaptionsTracklistRenderer` 中的字幕轨道
- **TCP Socket 代理穿透**：遇到验证码时，通过 [Webshare.io](https://webshare.io) 代理建立 TLS 隧道，使用 Cloudflare Workers 的 `connect()` TCP Socket API 发起 CONNECT 请求

字幕语言优先级：英文 > 简体中文 > 繁体中文，手动字幕优先于自动生成字幕（ASR）。

VTT 字幕下载后经过时间戳和标签剥离，保留纯文本，并通过字符上限截断（默认 150K）控制 prompt 长度。

### 2. 如何调用 AI 并实现流式输出

支持 **Gemini** 和 **Anthropic/DeepSeek** 双 provider，通过 `AI_PROVIDER` 环境变量切换。

流式输出链路：

```
AI API SSE → anthropicToGeminiStream (格式统一)
          → Relay TransformStream (提取文本 + 累积)
          → 统一格式 SSE (type: text/done/error)
          → Worker Response (SSE)
          → 前端 EventSource
```

关键设计：
- 所有 provider 的 SSE 格式统一转换为 Gemini 兼容格式（`candidates[0].content.parts[0].text`）
- `Relay TransformStream` 在转发过程中同步累积全文，流结束后直接获得完整文章用于章节解析和 KV 存储
- DeepSeek 模型通过 `thinking: { type: 'disabled' }` 关闭扩展思考，避免 thinking tokens 消耗回复预算
- 前端使用 `EventSource` 接收 SSE，通过正则匹配 `##` 标题实时检测章节，requestAnimationFrame 节流渲染

### 3. 如何根据用户生成要求影响输出结果

用户通过「偏好设置」输入自然语言要求（可选），覆盖四种约束维度：

| 维度 | 示例 |
|------|------|
| 任务类型 | "生成摘要"、"只翻译" |
| 输出风格 | "学术严谨"、"幽默风趣" |
| 目标受众 | "给产品经理看的"、"适合转发家族群" |
| 约束条件 | "500 字以内"、"只关注技术部分" |

实现方式：用户要求直接注入 prompt 构建阶段。`buildArticlePrompt()` 将要求以 `用户特别要求：xxx` 格式追加到 system instruction 之后，AI 在生成过程中自然遵循约束。

### 4. 如何实现章节级 5W1H 总结

流程：

1. **章节切割**：流式输出完成后，通过解析 Markdown `##` 标题将文章拆分为章节，记录每个章节的 `startOffset/endOffset`
2. **上下文构建**：请求某章节分析时，服务端从 KV 加载已存储的 session，提取该章节内容和全局章节索引作为上下文
3. **AI 分析**：向 AI 发送结构化 prompt，要求返回固定 JSON 格式的 5W1H 总结 + 维度高亮锚点
4. **KV 缓存**：分析结果写入 KV（`session:{id}:chapter-analysis:{index}`），同一章节重复点击直接返回缓存，不重复调用 AI

关键约束：前端仅传 `sessionId + chapterIndex`，不再提交整篇文章——由服务端基于已存储上下文完成分析。

### 5. 主要工程取舍和亮点

| 决策 | 理由 |
|------|------|
| **纯 KV，不用 D1** | 数据结构以 session 为粒度整体读写，无复杂查询需求，KV 更简单且延迟更低 |
| **AI SSE 格式统一层** | 不直接透传原始 SSE，在 Relay 中同步累积文本，流结束后无需二次请求即可获得完整文章 |
| **ctx.waitUntil 保证持久化** | session 保存作为异步 Promise 通过 `ctx.waitUntil` 注册，确保 Worker 在响应返回后继续完成 KV 写入 |
| **正则章节检测（非 DOM）** | 流式生成时从原始 Markdown 文本检测 `##` 标题，避免 DOM 查询在增量渲染下的时序问题 |
| **contextAnchor 锚点匹配** | 5W1H 高亮使用文本锚点匹配而非位置索引，Markdown 渲染后 DOM 位置变化不影响定位 |
| **多客户端 InnerTube 降级** | Web/ANDROID/MWEB 三种 client 身份按序尝试，提高字幕获取成功率，避免单点失效 |
| **硬编码字幕资产** | 对演示/已知视频提供 zero-network 兜底，保证演示稳定性和离线可用 |
| **Light DOM Web Components** | 非 Shadow DOM，Markdown 渲染后的内容可直接被全局样式继承，跨组件 DOM 操作不受 shadow boundary 限制 |

## 项目结构

```
src/
├── backend/
│   ├── domain/
│   │   ├── video/         # YouTube 字幕获取（fetcher + parser + validator）
│   │   ├── article/       # 文章生成（prompt + generator + relay）
│   │   └── analysis/      # 5W1H 分析服务
│   ├── orchestration/     # 会话编排（create / continue / chapter-analysis）
│   ├── infra/             # generate client / KV store / proxy tunnel
│   ├── http/              # 路由 + SSE 适配 + 错误定义
│   ├── bootstrap.ts       # 组合根（依赖注入）
│   └── index.ts           # Worker 入口
└── frontend/
    ├── components/        # Web Components（url-form / stream-view / chapter-card）
    ├── services/          # API 调用 + SSE 客户端
    └── utils/             # Markdown 渲染 + XSS 防护
```
