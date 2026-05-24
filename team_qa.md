# QA 测试报告 — NovelCraft

**测试日期**: 2026-05-24  
**测试范围**: API 端点、页面渲染、TypeScript 类型检查、ESLint 静态分析  
**测试方式**: curl + tsc --noEmit + ESLint  
**服务器**: Next.js 16.2.6, dev mode, localhost:3000  

---

## 一、API 端点测试

### 1.1 `/api/storage`

| 方法 | 测试场景 | HTTP 状态 | 响应体 | 结论 |
|------|----------|-----------|--------|------|
| GET  | 无参数，查询全部 | 200 | `[{...}, ...]` 正常返回 | PASS |
| GET  | `?id=test-001` 存在 | 200 | 完整 Novel JSON | PASS |
| GET  | `?id=nonexistent` 不存在 | 404 | `null` | PASS |
| POST | 合法 JSON 体 | 200 | `{"ok":true}` | PASS |
| DELETE | `?id=test-001` 存在 | 200 | `{"ok":true}` | PASS |
| DELETE | 无 id 参数 | 400 | `{"error":"id required"}` | PASS |

### 1.2 `/api/ai`

| 方法 | 测试场景 | HTTP 状态 | 响应体 | 结论 |
|------|----------|-----------|--------|------|
| POST | 合法 JSON (`systemPrompt` + `userMessage`) | 200 | `{"text":"..."}` AI 回复 | PASS |
| POST | 非法 JSON (not-json) | **500** | 空 | **FAIL** |

> **Bug #01**: 非法 JSON 输入返回 HTTP 500，服务器端未 try-catch `req.json()`，应由服务端捕获并返回 400 Bad Request。

### 1.3 `/api/ai/chat` (流式 SSE)

| 方法 | 测试场景 | HTTP 状态 | 结论 |
|------|----------|-----------|------|
| POST | 合法请求 | 200 | SSE 流正常推送，含 `event:` + `data:` | PASS |

### 1.4 `/api/ai/generate` (四阶段流式生成)

| 方法 | 测试场景 | HTTP 状态 | 结论 |
|------|----------|-----------|------|
| POST | `{"idea":"test story"}` | 200 | 四阶段 SSE 数据正常推送 (meta → world → characters → outline) | PASS |
| POST | `{"idea":""}` 空字符串 | 200 | AI 仍自动生成完整小说，非阻断 | PASS |

### 1.5 `/api/ai/autowrite` (自动写作 SSE)

| 方法 | 测试场景 | HTTP 状态 | 结论 |
|------|----------|-----------|------|
| POST | 有 draft 章节 | 200 | SSE 逐章推送 writing 事件 | PASS |
| POST | 空 `chapters:[]` | 200 | 立即返回 `{"phase":"complete","status":"done"}` | PASS |

---

## 二、页面路由测试（全部返回 HTTP 200）

| 路由 | 状态 | 备注 |
|------|------|------|
| `/` | 200 | 首页 Dashboard |
| `/agents` | 200 | Agent 监控面板 |
| `/project/test-001` | 200 | 项目概览 |
| `/project/test-001/world` | 200 | 世界观设定 |
| `/project/test-001/brainstorm` | 200 | 头脑风暴 |
| `/project/test-001/characters` | 200 | 角色设计 |
| `/project/test-001/timeline` | 200 | 故事时间线 |
| `/project/test-001/outline` | 200 | 情节大纲 |
| `/project/test-001/write` | 200 | 写作编辑器 |
| `/project/test-001/bible` | 200 | 故事圣经 |
| `/project/test-001/export` | 200 | 导出作品 |

全部 11 个页面返回 HTTP 200。注意：所有动态路由页面在 `projectId` 不存在时仍返回 200（客户端加载显示"加载中..."），不返回 404。如果要严格 RESTful，不存在的项目 ID 可考虑服务端 404。

---

## 三、TypeScript 静态检查

运行 `npx tsc --noEmit`：

```
(no output — 零 TypeScript 错误)
```

**结论: PASS** — 所有 TypeScript 文件通过类型检查，无编译错误。

---

## 四、ESLint 问题列表

运行 `npx eslint src/` 发现的全部问题：

### 错误 (Errors)

| 文件 | 行 | 规则 | 问题描述 |
|------|----|------|----------|
| `src/app/agents/page.tsx` | 134 | `react-hooks/purity` | `Date.now()` 在 render 中调用（纯函数违规），每次渲染产生不同结果 |
| `src/app/page.tsx` | 158 | `react/no-unescaped-entities` | 未转义的中文引号 `"📖 使用指南"`，应使用 `&ldquo;`/`&rdquo;` |
| `src/app/project/[id]/brainstorm/page.tsx` | 45-48 | `react/no-unescaped-entities` | 8 处未转义引号（4 行各 2 处） |
| `src/app/project/[id]/timeline/page.tsx` | 17 | `react-hooks/set-state-in-effect` | `useEffect` 中同步调用 `setEvents()`，导致级联重渲染 |
| `src/app/project/[id]/world/page.tsx` | 27 | `react-hooks/set-state-in-effect` | `useEffect` 中同步调用 `setSettings()`，导致级联重渲染 |

### 警告 (Warnings)

| 文件 | 行 | 规则 | 问题描述 |
|------|----|------|----------|
| `src/app/api/ai/generate/route.ts` | 27 | `no-unused-vars` | 常量 `PHASES` 声明后从未使用 |
| `src/app/api/ai/generate/route.ts` | 35 | `no-unused-vars` | 解构参数 `model` 从未使用（路由收到 model 参数但忽略） |
| `src/app/project/[id]/outline/page.tsx` | 2 | `no-unused-vars` | 导入 `useCallback` 未使用 |
| `src/components/AIChat.tsx` | 3 | `no-unused-vars` | 导入 `callAI` 未使用（改用 `streamAIChat`） |
| `src/components/AIChat.tsx` | 58 | `no-unused-vars` | 参数 `err` 未使用（onError 回调中） |
| `src/components/AIChat.tsx` | 144 | `no-unused-expressions` | 无效的无用表达式 |
| `src/components/AutoWrite.tsx` | 3 | `no-unused-vars` | 导入 `Chapter` 类型未使用（仅依赖类型推断） |

---

## 五、Bug 列表（按严重程度）

### P0 — 严重缺陷

| ID | 文件 | 描述 |
|----|------|------|
| **B-01** | `src/app/api/ai/route.ts` | **非法 JSON 导致 HTTP 500** — 无 `try-catch` 包装 `req.json()`，发送非法 JSON 时后端崩溃返回 500。应捕获并返回 400 Bad Request。 |
| **B-02** | `src/components/ChapterEditor.tsx:147-149` | **Tailwind 动态类名在 production 构建中失效** — 使用 `bg-${mode.color}-50` 和 `text-${mode.color}-700` 模板字符串拼接类名。Tailwind JIT 编译器无法静态分析这些运行时拼接的类名，production 构建时将全部被 purge 掉，导致 AI 按钮在 production 模式下无背景色和文字颜色。 |
| **B-03** | `src/app/api/ai/generate/route.ts:35` | **model 参数被忽略** — `POST /api/ai/generate` 从 request body 中解构 `model` 参数但从未使用，始终使用环境变量 `ANTHROPIC_DEFAULT_OPUS_MODEL`。用户在前端 QuickCreate 组件中选择的模型无效。 |

### P1 — 主要缺陷

| ID | 文件 | 描述 |
|----|------|------|
| **B-04** | `src/app/project/[id]/world/page.tsx:27`, `src/app/project/[id]/timeline/page.tsx:17` | **级联重渲染** — 两个页面在 `useEffect` 同步调用 `setState`（`setSettings`/`setEvents`），违反 React 19 规则，每次从 API 加载项目数据会触发额外一次重渲染。 |
| **B-05** | `src/app/project/[id]/write/page.tsx:37` + `src/lib/types.ts` | **Chapter 类型缺失 `updatedAt` 字段** — `Chapter` 接口未定义 `updatedAt`，但 `ChapterEditor.tsx` 在保存时写入了 `updatedAt` 并用 `as Chapter & { updatedAt: string }` 绕过类型检查。应将该字段合并到类型定义中。 |
| **B-06** | `src/lib/ai.ts:52-62` | **SSE 流式客户端错误处理 `thinking_delta`** — Anthropic SSE 格式包含 `thinking_delta` 块，其文本在 `delta.thinking` 而非 `delta.text`。当前代码 `json.delta?.text` 在所有 `content_block_delta` 上调用，导致 thinking 阶段持续推送空字符串到 UI。 |
| **B-07** | `src/app/agents/page.tsx:134` | **render 中调用 impure 函数** — 在 JSX 中直接调用 `Date.now()`，每次渲染产生不同时间戳，违反 React 18+ 组件纯函数要求。 |

### P2 — 轻微缺陷

| ID | 文件 | 描述 |
|----|------|------|
| **B-08** | `src/app/api/ai/route.ts:28-31` | **错误处理逻辑不当** — AI API 请求失败时返回 HTTP 200 但响应体为 `{text: "错误信息"}`，前端无法通过 HTTP 状态码判断是否成功，只能检查返回文本内容。应使用适当的状态码（如 502）。 |
| **B-09** | `src/app/page.tsx:158` 以及 `src/app/project/[id]/brainstorm/page.tsx:45-48` | **JSX 中未转义中文引号** — 使用 `"..."` 中文引号虽能渲染，但 ESLint `react/no-unescaped-entities` 规则要求转义。 |
| **B-10** | Multiple files | **未使用的导入/变量** — `useCallback` (outline/page.tsx), `callAI` (AIChat.tsx), `Chapter` (AutoWrite.tsx), `PHASES` (generate/route.ts) 等共 7 处 unused vars。 |
| **B-11** | `/api/storage` GET 无参数 | **返回排序性能风险** — 当 `data/` 目录积累大量 JSON 文件时，`readdirSync` + 全部 `readFileSync` + 排序可能在主线程上阻塞。大项目应考虑流式或分页。 |

### P3 — 建议/UI 小问题

| ID | 文件 | 描述 |
|----|------|------|
| **B-12** | `src/app/project/[id]/brainstorm/page.tsx:33` | `onBlur` 中调用 `saveProject(novel)` — 但 `novel` 是旧的闭包引用，如果用户快速输入后移开焦点，可能保存过时状态。建议使用 `useRef` 或 debounce。 |
| **B-13** | 无具体文件 | **缺少 `.env.example`** — 项目依赖 `ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_DEFAULT_OPUS_MODEL` 三个环境变量，没有示例文件，新开发者无法知道需要配置什么。 |
| **B-14** | `src/lib/storage.ts` | **`getProject` 返回 `null` 时无日志** — 当 `fetch` 失败（网络错误）时，`getProject` 静默返回 `null`，不打印任何错误日志，难以调试。 |

---

## 六、综合评分

| 项 | 评分 | 说明 |
|----|------|------|
| API 功能 | 4/5 | 核心端点均正常工作，非法输入处理有缺失 |
| 页面渲染 | 5/5 | 全部 11 个页面返回 200 |
| TypeScript 安全性 | 5/5 | 零编译错误 |
| 代码质量/ESLint | 2/5 | 5 个错误 + 7 个警告 |
| 错误处理 | 2/5 | 多处未处理边界情况 |
| **综合** | **3.6/5** | 功能可用，但存在多个需修复的缺陷 |

**建议修复优先级**: B-01 > B-02 > B-03 > B-04 = B-07 > B-05 = B-06 > B-08 > B-09 > B-10
