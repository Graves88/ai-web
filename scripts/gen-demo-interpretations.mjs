// 生成演示版用的"预生成 AI 解读"：本地跑一遍，把结果存成 JSON 提交到仓库。
// 这样公网 demo 不需要 LLM_API_KEY、也不会被陌生人刷余额。
// 用法：node scripts/gen-demo-interpretations.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const BASE_URL = env.LLM_BASE_URL || "https://api.deepseek.com/v1";
const MODEL = env.LLM_MODEL || "deepseek-chat";
const API_KEY = env.LLM_API_KEY;
if (!API_KEY) {
  console.error("缺少 LLM_API_KEY（.env.local）");
  process.exit(1);
}

const cases = JSON.parse(fs.readFileSync(path.join(root, "seed", "cases.json"), "utf8"));
const outPath = path.join(root, "seed", "demo-interpretations.json");
const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
const force = process.argv.includes("--force");

// 与 lib/prompts/interpret/v1.ts 保持一致的 prompt（改那边要同步这里）
function buildMessages(c, id) {
  const fixtures = (c.fixtures ?? [])
    .map(
      (f) =>
        `- ${f.type}${f.model ? `（${f.model}）` : ""}：${f.watt}W × ${f.qty} 套，${f.lumen ?? "?"}lm，${f.cct ?? "?"}K，Ra${f.cri ?? "?"}${f.layout ? `，${f.layout}` : ""}`,
    )
    .join("\n");
  const totalW = (c.fixtures ?? []).reduce((s, f) => s + (Number(f.watt) || 0) * (Number(f.qty) || 0), 0);
  const lpd = c.area_m2 > 0 ? Math.round((totalW / c.area_m2) * 100) / 100 : null;

  const system = [
    "你是一位照明设计行业的技术顾问，正在为同事解读一个已落地的照明项目案例。",
    "",
    "硬性规则：",
    "1. 只能引用【案例资料】里出现过的参数；资料没写就写“资料未提及”，绝不编造数字、型号或标准号。",
    "2. 总功率与 LPD 已经由系统算好，直接使用，不要自己重新计算。",
    "3. 输出 Markdown，严格三段，每段 2-4 条：## 亮点 / ## 适用场景 / ## 可复用建议",
    "4. 中文，克制、具体，总字数 300 字以内。不要开场白、不要总结陈词。",
  ].join("\n");

  const user = [
    "【案例资料】",
    `标题：${c.title}`,
    `场所类型：${c.space_type}`,
    `年份：${c.year ?? "未提及"}｜地区：${c.region ?? "未提及"}`,
    `面积：${c.area_m2 ?? "未提及"} ㎡｜层高：${c.floor_height_m ?? "未提及"} m｜目标照度：${c.target_lux ?? "未提及"} lx`,
    `预算区间：${c.budget_range ?? "未提及"}`,
    "灯具清单：",
    fixtures || "（无）",
    `系统计算：总功率 ${Math.round(totalW * 10) / 10} W，功率密度 LPD ${lpd ?? "—"} W/㎡`,
    `设计要点：${(c.design_points ?? []).join("；") || "未提及"}`,
    `项目亮点：${(c.highlights ?? []).join("；") || "未提及"}`,
    `可复用点：${(c.reuse_points ?? []).join("；") || "未提及"}`,
    c.raw_text ? `原始资料摘要：${c.raw_text}` : "",
    "",
    "请按规则输出三段 Markdown 解读。",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const out = { ...existing };
// 支持 --ids=1,5,8 只重生成指定案例
const idsArg = process.argv.find((a) => a.startsWith("--ids="));
const onlyIds = idsArg ? new Set(idsArg.slice(6).split(",").map((s) => s.trim())) : null;

for (let i = 0; i < cases.length; i++) {
  const id = String(i + 1);
  if (onlyIds && !onlyIds.has(id)) continue;
  if (out[id] && !force && !onlyIds) {
    console.log(`#${id} 已存在，跳过`);
    continue;
  }
  const t0 = Date.now();
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages: buildMessages(cases[i], id), temperature: 0.4 }),
  });
  if (!res.ok) {
    console.error(`#${id} 失败 ${res.status}:`, (await res.text()).slice(0, 200));
    continue;
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  out[id] = text;
  console.log(`#${id} ✅ ${text.length} 字 (${Date.now() - t0}ms) uses ${data?.usage?.total_tokens ?? "?"} tokens`);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`\n写入 ${outPath}，共 ${Object.keys(out).length} 条`);
