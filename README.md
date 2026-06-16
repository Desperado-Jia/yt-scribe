# YT Scribe

YouTube 视频 → 中文深度文章 + 章节级 5W1H 分析 + 魔术高亮交互

基于 Cloudflare 边缘计算的全栈 AI 应用，支持任意 YouTube 视频。

## 架构

```
┌─── Cloudflare Pages ───┐     ┌─── Cloudflare Worker ───┐
│  TypeScript SPA         │     │  Domain-Oriented Arch    │
│  Web Components (Light) │     │  session/ → video/       │
│  ObservableStore        │     │           → article/     │
│  0KB runtime deps       │     │           → analysis/    │
└─────────────────────────┘     │  + llm-client, rate-limit│
                                └──────────────────────────┘
                                        │         │
                                    ┌───▼───┐ ┌──▼──┐
                                    │  D1   │ │ KV  │
                                    └───────┘ └─────┘
```

## 核心特性

- **流式输出**: SSE 实时推送文章，首帧含 metadata（sessionId + ownerToken）
- **三层字幕降级**: 直连 YouTube → TCP Socket 代理 → 硬编码兜底
- **5W1H 结构化分析**: 每章节提取 Who/What/When/Where/Why/How
- **魔术高亮**: 三层锚点回退匹配（精确 → 模糊正则 → 短语直搜）
- **HMAC 无状态鉴权**: owner_token 验证 0 D1 读消耗
- **SSE 断连恢复**: 3 次指数退避重连 + salvage 紧急封盘
- **僵尸会话自愈**: processing > 3min 自动修正为 failed
- **XSS 三层防线**: marked html:false + 自定义 Renderer + DOMParser 白名单

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | TypeScript + Web Components (Light DOM) + Vite |
| 后端 | Cloudflare Worker + esbuild |
| 存储 | Cloudflare D1 (SQLite) + KV |
| AI | Gemini 2.0 Flash / Claude 3.5 Sonnet |
| 测试 | vitest (单元+集成) + Playwright (E2E) |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置密钥
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填入 API Keys

# 3. 初始化 D1
npx wrangler d1 execute yt-scribe-db --local --file=./migrations/0001-init-schema.sql

# 4. 启动后端 (端口 8787)
npx wrangler dev src/backend/bootstrap.ts --port 8787

# 5. 启动前端 (端口 5173, 代理到 8787)
npx vite
```

## 项目结构

```
src/
├── shared/contracts/     # 前后端共享类型
├── backend/
│   ├── video/            # YouTube 字幕获取
│   ├── article/          # 文章生成 + 章节解析
│   ├── analysis/         # 5W1H 提取 + 高亮匹配
│   ├── session/          # 会话编排 + 存储 + 鉴权
│   ├── llm-client/       # 多模型 LLM 客户端
│   ├── observability/    # 日志 + 遥测
│   ├── rate-limiter/     # IP 频控 + 月度熔断
│   ├── http/             # 路由 + 中间件 + SSE
│   └── bootstrap.ts      # 组合根
└── frontend/
    ├── components/       # Web Components
    ├── pages/            # 路由页面
    ├── state/            # ObservableStore
    ├── services/         # API + SSE + Auth
    └── utils/            # Router + Markdown + Sanitize
```

## 部署

```bash
# 创建 D1 + KV
npx wrangler d1 create yt-scribe-db-prod
npx wrangler kv:namespace create YT_SCRIBE_KV_PROD

# 注入 Secrets
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put HMAC_SECRET

# 部署
npx esbuild src/backend/bootstrap.ts --bundle --minify --format=esm --outfile=dist/worker.js
npx wrangler deploy dist/worker.js
npx vite build && npx wrangler pages deploy dist/frontend --project-name=yt-scribe
```

## 工程决策

| 决策 | 理由 |
|------|------|
| Light DOM (非 Shadow DOM) | Markdown 排版 + 跨组件 DOM 定位 + 全局样式继承 |
| D1 无并发锁 | SQLite 无 SELECT FOR UPDATE，V2 用 Durable Objects |
| in-request 概率清理 | 月增 ~100KB，Cron Trigger 对 V1 是过度工程 |
| contextAnchor (非 position) | Markdown 渲染后 DOM 位置变化，锚点更鲁棒 |
| stream-relay 仅做格式统一 | 存储/遥测逻辑上移到 lifecycle 的 ctx.waitUntil |

## License

MIT
