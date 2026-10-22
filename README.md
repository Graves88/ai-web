# 照明落地案例库 · Lighting Case Library

把散落在聊天记录、PPT、Excel 里的**照明项目案例**，变成结构化、可筛选、能被 AI 解读的在线资产。

> 在线演示：https://www.chaole.top （只读演示版：数据脱敏、写操作关闭、AI 解读为预生成，避免公网被刷 API 费用）

---

## 它解决什么问题

照明设计/工程行业里，项目案例通常散在：微信聊天记录、报价单 Excel、方案 PPT、设计师个人电脑。
结果是——

- 销售想找"300㎡ 办公空间"的类似案例，只能翻聊天记录
- 新人学习没有可检索的案例库
- 每个项目都要重做选型与说明，经验不沉淀

这个应用把这些案例变成：**可搜索、可筛场所类型、带真实图片/视频、能被 AI 自动解读**的结构化数据。

---

## 功能

| 功能 | 说明 |
|---|---|
| 瀑布流案例列表 | 场所频道筛选、关键词搜索（URL 驱动，可分享可后退） |
| 案例详情 | 关键参数、灯具清单、多图相册（点击看大图）、视频播放 |
| **AI 解读（流式）** | 基于案例资料生成「亮点 / 适用场景 / 可复用建议」，SSE 逐字输出，可中途停止 |
| 案例录入 / 编辑 / 删除 | 表单录入 + 灯具清单可加行，总套数/总功率/LPD 实时预览 |
| 演示模式（DEMO_MODE） | 只读 seed 数据、写操作 403、AI 解读读预生成结果，线上不配 LLM key |

---

## 技术栈与架构

```
浏览器
  │
  ├─ /cases            服务端组件：直接调用 lib/cases.ts 读数据（演示模式读 seed JSON）
  ├─ /cases/[id]       服务端组件 + 客户端子组件（相册交互、AI 解读面板）
  └─ /api/interpret    Route Handler：SSE 流式转发，监听客户端断开 → 中止上游
        │
        └─ OpenAI 兼容接口（DeepSeek），密钥只在服务端 .env.local
```

- **Next.js 16（App Router）+ TypeScript + Tailwind 4**
- **数据层**：`node:sqlite`（Node 内置，零依赖）；演示模式不碰数据库
- **AI**：`fetch` 直连 OpenAI 兼容接口 + ReadableStream，不引 SDK
- **部署**：Vercel + 自定义域名（国内访问做了 IP /CDN 适配）

### 三个关键设计决策

1. **算数交给代码，不交给模型**
   总功率 = Σ(功率×数量)、LPD = 总功率/面积，全部由 `calcTotals()` 计算；模型只负责语义（挑重点、写解释）。
   理由：LLM 做算术会错且错得隐蔽；计量字段必须确定、可复核。

2. **提示词版本化 + A/B 评测**
   `lib/prompts/interpret/v1.ts` / `v2.ts` 并存，`scripts/eval-interpret.mjs` 跑规则化评测（结构合规/参数命中/编造标记/字数），
   用数据而不是感觉选版本（结果见下）。

3. **演示环境预生成 AI 输出**
   公网 demo 不开放实时模型调用：本地把 10 条解读生成好存 `seed/demo-interpretations.json`，
   线上按块"模拟流式"下发。零成本、零滥用风险，同时保留完整流式体验。

---

## 评测结果（prompt v1 vs v2）

`node scripts/eval-interpret.mjs` · 10 个案例 × 2 个版本 · 规则化自动判定（不依赖 LLM 当裁判）

| 版本 | 结构合规率 | 关键参数命中率 | 编造率 | 平均字数 |
|---|---|---|---|---|
| v1 | 100% | 69.5% | 0% | 286 |
| **v2** | 100% | **85.5%** | 0% | 350 |

- **v2 的"每段必须引用一个具体数字"约束，把参数命中率从 69.5% 提到 85.5%**，代价是输出长度 +22%（token 成本同步上升）。
- 编造判定口径：输出里的标准编号（GB/JGJ/CJJ）、照度值、UGR，只要整份案例资料里没出现过，就算一次编造；两版均为 0。
- 原始输出在 `evals/raw/`，报告在 `evals/report.md`。

---

## 怎么本地跑

```bash
pnpm install
cp .env.example .env.local     # 填 LLM_API_KEY（任何 OpenAI 兼容接口都行）

pnpm seed                      # 导入 10 条演示案例到 data/cases.db
pnpm dev                       # http://localhost:3000

# 可选
node scripts/eval-interpret.mjs            # 跑 A/B 评测（会调用模型）
node scripts/gen-demo-interpretations.mjs  # 重新生成演示版预生成解读
```

> 数据文件 `data/cases.db`、真实素材目录 `data/corpus/` 都在仓库外，永不提交；
> `.gitignore` 已排除 `/data/`、`public/uploads/`、`evals/results-*.json`。

---

## 目录结构

```
app/
  page.tsx              AI 调试页（本地开发用；演示模式自动跳 /cases）
  layout.tsx            viewport / 主题 / 关键兜底 CSS（兼容旧浏览器）
  cases/page.tsx        列表（瀑布流 + 筛选）
  cases/[id]/page.tsx   详情（hero / 参数 / 相册 / 视频 / AI 解读）
  cases/new/            新建表单
  cases/[id]/edit/      编辑表单
  api/chat/             最小模型链路（非流式）
  api/interpret/        SSE 流式解读
  api/cases/            案例 CRUD（zod 校验）
lib/
  db.ts                 node:sqlite 连接与建表
  cases.ts              查询/写入 + 演示模式数据源切换
  calc.ts               calcTotals（纯函数）
  demo.ts / demo-interpretations.ts
  prompts/interpret/    v1 / v2 提示词
scripts/
  seed.mjs / eval-interpret.mjs / gen-demo-interpretations.mjs / smoke-*.mjs
seed/
  cases.json            10 条脱敏演示案例（含 media）
  demo-interpretations.json  预生成解读
public/demo/cases/      演示图片与视频
```
