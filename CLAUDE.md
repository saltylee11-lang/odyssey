# 奥德赛 (Odyssey) — 项目说明书

## 这是什么

一个帮助用户进行深度自我对话的个人日记应用。核心特色：
- AI（DeepSeek）充当"内心深处的回声"，向用户提问、引导反思
- 以"你在世上的第 N 天"为核心隐喻（出生日 = 第 1 天）
- 时间轴可视化展示一生的记录

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.2 (App Router, Turbopack) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4，毛玻璃设计风格 |
| 数据库 | Supabase PostgreSQL（通过 REST API 访问，非直连） |
| 认证 | Supabase Auth（邮箱+密码） |
| AI | DeepSeek Chat API（通过 Next.js API Route 代理，避免 CORS） |
| 部署 | Vercel + Supabase 云端 |

## 本地运行

```bash
npm install
npm run dev    # 启动在 localhost:3000
```

需要 `.env.local` 文件（当前已有，不会上传到 Git）。

## 环境变量

```
NEXT_PUBLIC_SUPABASE_URL=https://ynvhqdvooprizehayptc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://...（备查，实际运行时走 REST API）
```

## 核心文件

```
src/
├── middleware.ts                  # 认证守卫，getSession() 读 cookie（快）
├── app/
│   ├── layout.tsx                 # 根布局 + Toast + PWA + 背景
│   ├── page.tsx                   # 首页 = 登录/注册（Supabase Auth）
│   ├── dashboard/page.tsx         # 主页：天数、最近记录、API Key
│   ├── journal/
│   │   ├── new/page.tsx           # 写日记：普通/AI聊天/AI引导 三种模式
│   │   └── [id]/page.tsx          # 日记详情：内容、AI对话、摘要编辑、删除
│   ├── timeline/page.tsx          # 时间轴：刻度尺、虚拟滚动、跳转日期
│   ├── search/page.tsx            # 全文搜索
│   ├── settings/page.tsx          # 设置
│   └── api/
│       ├── chat/route.ts          # AI 对话代理
│       ├── resummarize/route.ts   # AI 重新生成摘要
│       └── journal/entries/[id]/chat/route.ts  # 流式 AI 对话
├── actions/
│   ├── journal.ts                 # 日记 CRUD + 搜索（Server Actions）
│   ├── profile.ts                 # 用户资料 + daysAlive
│   └── migration.ts               # localStorage → 云端迁移
├── components/ui/                 # 共享 UI：GlassCard, Button, Toast 等
├── lib/
│   ├── db/index.ts                # Supabase 服务端客户端
│   ├── ai.ts + ai/prompts.ts      # AI 调用 + 提示词
│   └── auth/client.ts             # Supabase 浏览器客户端
└── public/                        # PWA manifest, icon, service worker
```

## 数据库（Supabase，RLS 已启用）

- **profiles** — `id (→ auth.users)`, `name`, `birthdate`, `created_at`
- **journal_entries** — `id`, `user_id`, `content`, `summary`, `tags (text[])`, `day_number`, `created_at`
- **ai_messages** — `id`, `entry_id`, `sequence`, `role`, `content`
- **reminders** — `id`, `user_id`, `time`, `enabled`

## 关键决策

1. **不用 ORM**：通过 Supabase JS 客户端（REST API）访问数据库，解决免费层无直连问题
2. **中间件用 getSession()**：只读 cookie（毫秒），不用 getUser()（网络请求 400ms+）
3. **AI 走代理**：浏览器 → `/api/chat` → DeepSeek，解决 CORS
4. **时间轴虚拟滚动**：只渲染可见刻度，防 50000 个 DOM 节点
5. **出生日 = 1**：所有天数已 +1
6. **摘要可为空**：无 AI 保存时为空；与原文雷同时自动清空

## 部署

- GitHub: `saltylee11-lang/odyssey`
- Vercel: `odyssey-ten-phi.vercel.app`（自动部署）
- Supabase 项目: `ynvhqdvooprizehayptc`
- 环境变量在 Vercel Settings 配置
- SQL 迁移在 Supabase SQL Editor 运行
