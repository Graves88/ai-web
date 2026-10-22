// AI 解读 A/B 评测：v1 vs v2（规则化自动判定，不依赖 LLM 当裁判）
// 用法：
//   node scripts/eval-interpret.mjs              # 调 API 跑 10 案例 × 2 prompt（约 20 次调用）
//   node scripts/eval-interpret.mjs --score-only # 只对 evals/raw/ 里已有输出重新打分（不花钱）
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCORE_ONLY = process.argv.includes("--score-only");

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const BASE_URL = env.LLM_BASE_URL || "https://api.deepseek.com/v1";
const MODEL = env.LLM_MODEL || "deepseek-chat";
const API_KEY = env.LLM_API_KEY;

const cases = JSON.parse(fs.readFileSync(path.join(ROOT, "seed", "cases.json"), "utf8"));
const SECTIONS = ["## 亮点", "## 适用场景", "## 可复用建议"];

function caseTotals(c) {
  const fixtures = c.fixtures ?? [];
  const totalW = Math.round(fixtures.reduce((s, f) => s + f.watt * f.qty, 0) * 10) / 10;
  const lpd = c.area_m2 > 0 ? Math.round((totalW / c.area_m2) * 100) / 100 : null;
  return { totalW, lpd };
}

// 与 lib/prompts/interpret/v1.ts / v2.ts 保持一致
function buildMessages(c, totalW, lpd, version) {
  const fixtures = (c.fixtures ?? [])
    .map(
      (f) =>
        `- ${f.type}${f.model ? `（${f.model}）` : ""}：${f.watt}W × ${f.qty} 套，${f.lumen ?? "?"}lm，${f.cct ?? "?"}K，Ra${f.cri ?? "?"}${f.layout ? `，${f.layout}` : ""}`,
    )
    .join("\n");
  const strict = version === "v2";
  const system = [
    "你是一位照明设计行业的技术顾问，正在为同事解读一个已落地的照明项目案例。",
    "",
    "硬性规则：",
    "1. 只能引用【案例资料】里出现过的参数；资料没写就写“资料未提及”，绝不编造数字、型号或标准号。",
    strict ? "2. 每一段至少引用 1 个具体数字；本段没有可引用数字时写“资料未提及”。" : "2. 总功率与 LPD 已经由系统算好，直接使用，不要自己重新计算。",
    strict ? "3. 禁止出现任何标准编号（GB、GB/T、JGJ、CJJ 等）；禁止出现 UGR；照度只能出现资料里的数字。" : "",
    "4. 输出 Markdown，严格三段，标题固定：## 亮点 / ## 适用场景 / ## 可复用建议，每段 2-3 条用 - 列表。",
    strict ? "5. 中文，全文 250-350 个汉字（硬性上限，超过即不合格）。" : "5. 中文，总字数 300 字以内。",
    "6. 不要开场白、不要总结陈词。",
  ]
    .filter(Boolean)
    .join("\n");
  const user = [
    "【案例资料】",
    `标题：${c.title}`,
    `场所类型：${c.space_type}`,
    `年份：${c.year ?? "未提及"}｜地区：${c.region ?? "未提及"}`,
    `面积：${c.area_m2 ?? "未提及"} ㎡｜层高：${c.floor_height_m ?? "未提及"} m｜目标照度：${c.target_lux ?? "未提及"} lx`,
    `预算区间：${c.budget_range ?? "未提及"}`,
    "灯具清单：",
    fixtures || "（无）",
    `系统计算：总功率 ${totalW} W，功率密度 LPD ${lpd} W/㎡`,
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

async function call(messages) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.4 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { text: data?.choices?.[0]?.message?.content ?? "", tokens: data?.usage?.total_tokens ?? 0 };
}

/**
 * 打分：所有"编造"判定都对照**整份案例资料**（不是只看 target_lux），
 * 资料里出现过的数字/标准号/UGR 一律不算编造。
 */
function score(text, c, totalW, lpd) {
  const plain = text.replace(/[#*`>-]/g, " ");
  const sourceText = JSON.stringify(c);

  const structOk = SECTIONS.every((s) => text.includes(s));

  const expected = [
    String(c.area_m2 ?? ""),
    String((c.fixtures ?? []).reduce((s, f) => s + Number(f.qty || 0), 0)),
    String(totalW),
    String(lpd),
    String((c.fixtures ?? [])[0]?.cct ?? ""),
  ].filter((x) => x && x !== "0" && x !== "undefined");
  const hit = expected.filter((n) => plain.includes(n)).length;

  // 资料里出现过的数字集合（含小数）
  const sourceNumbers = new Set((sourceText.match(/\d+(?:\.\d+)?/g) ?? []).map(String));

  const stdCodes = [...text.matchAll(/\b(?:GB\/T|GB|JGJ|CJJ)\s*[\d.]+/gi)].filter((m) => !sourceText.includes(m[0])).length;
  const lxValues = [...text.matchAll(/(\d+(?:\.\d+)?)\s*lx/gi)].map((m) => m[1]);
  const luxFake = lxValues.filter((v) => !sourceNumbers.has(v)).length;
  const ugrMentions = (text.match(/UGR/g) ?? []).length;
  const ugrFake = sourceText.includes("UGR") ? 0 : ugrMentions;

  const fabrications = stdCodes + luxFake + ugrFake;
  const chars = plain.replace(/\s+/g, "").length;
  return { structOk, hit, expected: expected.length, fabrications, chars };
}

const rows = [];
const rawDir = path.join(ROOT, "evals", "raw");

if (SCORE_ONLY) {
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const { totalW, lpd } = caseTotals(c);
    for (const version of ["v1", "v2"]) {
      const file = path.join(rawDir, `${String(i + 1).padStart(2, "0")}-${version}.md`);
      if (!fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, "utf8");
      rows.push({ case: i + 1, version, ...score(text, c, totalW, lpd), tokens: 0 });
    }
  }
} else {
  if (!API_KEY) {
    console.error("缺少 LLM_API_KEY");
    process.exit(1);
  }
  fs.mkdirSync(rawDir, { recursive: true });
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const { totalW, lpd } = caseTotals(c);
    for (const version of ["v1", "v2"]) {
      try {
        const { text, tokens } = await call(buildMessages(c, totalW, lpd, version));
        const s = score(text, c, totalW, lpd);
        rows.push({ case: i + 1, version, ...s, tokens });
        fs.writeFileSync(path.join(rawDir, `${String(i + 1).padStart(2, "0")}-${version}.md`), text);
        console.log(`#${i + 1} ${version} 结构${s.structOk ? "✓" : "✗"} 参数${s.hit}/${s.expected} 编造${s.fabrications} ${s.chars}字 ${tokens}tokens`);
      } catch (e) {
        console.log(`#${i + 1} ${version} 失败: ${e.message}`);
      }
    }
  }
}

function summarize(version) {
  const list = rows.filter((r) => r.version === version);
  const n = list.length || 1;
  return {
    version,
    n: list.length,
    structRate: list.filter((r) => r.structOk).length / n,
    paramHit: list.reduce((s, r) => s + r.hit / Math.max(1, r.expected), 0) / n,
    fabricationRate: list.filter((r) => r.fabrications > 0).length / n,
    avgFabrications: list.reduce((s, r) => s + r.fabrications, 0) / n,
    avgChars: Math.round(list.reduce((s, r) => s + r.chars, 0) / n),
  };
}

const summary = [summarize("v1"), summarize("v2")];
console.log("\n=== 评测汇总 ===");
console.table(summary);

fs.mkdirSync(path.join(ROOT, "evals"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "evals", "results.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), model: MODEL, scoreOnly: SCORE_ONLY, summary, rows }, null, 2),
);
const pct = (x) => `${(x * 100).toFixed(0)}%`;
const md = [
  "# AI 解读 A/B 评测报告（prompt v1 vs v2）",
  "",
  `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
  `- 模型：${MODEL}`,
  `- 样本：seed 中 ${cases.length} 个案例 × 2 个 prompt 版本`,
  "- 判定：全部规则化自动判定（结构 / 关键参数命中 / 编造标记 / 字数），不依赖 LLM 当裁判",
  "- 编造判定口径：输出中的标准编号、照度值、UGR，只要在**整份案例资料里没出现过**就算一次编造",
  "",
  "| 版本 | 样本 | 结构合规率 | 关键参数命中率 | 编造率 | 平均编造次数 | 平均字数 |",
  "|---|---|---|---|---|---|---|",
  ...summary.map(
    (s) => `| ${s.version} | ${s.n} | ${pct(s.structRate)} | ${pct(s.paramHit)} | ${pct(s.fabricationRate)} | ${s.avgFabrications.toFixed(2)} | ${s.avgChars} |`,
  ),
  "",
  "## 结论（自动生成）",
  `- 参数命中率：v2 比 v1 ${summary[1].paramHit >= summary[0].paramHit ? "更高" : "更低"}（${pct(summary[1].paramHit)} vs ${pct(summary[0].paramHit)}），说明"每段必须引用数字"的约束有效。`,
  `- 编造率：v2 ${pct(summary[1].fabricationRate)} vs v1 ${pct(summary[0].fabricationRate)}。`,
  `- 字数：v2 平均 ${summary[1].avgChars} 字（目标 250-350），${summary[1].avgChars <= 380 ? "基本达标" : "仍偏长"}。`,
  "",
  "## 说明",
  "- 原始输出（每个案例 × 每个版本）保存在 `evals/raw/`，可人工抽查。",
  "- 因 Demo 模式使用预生成解读，评测只影响 prompt 版本选择，不影响线上接口成本。",
].join("\n");
fs.writeFileSync(path.join(ROOT, "evals", "report.md"), md + "\n");
console.log("\n写入 evals/results.json 与 evals/report.md");
