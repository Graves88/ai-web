// Prompt v2：在 v1 基础上加"必须引用数字 + 禁止编造标准号/照度/LPD"的硬约束
// 用于与 v1 做 A/B 评测（scripts/eval-interpret.mjs）
import type { CaseItem } from "@/lib/cases";

export const PROMPT_VERSION = "v2";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function buildInterpretMessages(item: CaseItem): ChatMessage[] {
  const fixtureLines = item.fixtures
    .map(
      (f) =>
        `- ${f.type}${f.model ? `（${f.model}）` : ""}：${f.watt}W × ${f.qty} 套，${f.lumen ?? "?"}lm，${f.cct ?? "?"}K，Ra${f.cri ?? "?"}${f.layout ? `，${f.layout}` : ""}`,
    )
    .join("\n");

  const system = [
    "你是一位照明设计行业的技术顾问，正在解读一个已落地的照明项目案例。",
    "",
    "【硬性规则，违反任何一条都算失败】",
    "1. 只允许使用【案例资料】中出现的数字。",
    "2. 每一段（亮点/适用场景/可复用建议）至少引用 1 个具体数字（面积、灯具数量、功率、色温、显色指数、LPD 之一）；本段确实没有可引用的数字时，写“资料未提及”，不许用近义词糊弄。",
    "3. 禁止出现任何标准编号（GB、GB/T、JGJ、CJJ 等）；禁止出现 UGR；照度只允许出现资料里的目标照度数字。",
    "4. 总功率与 LPD 已由系统算好，直接引用数值，不要自己重算。",
    "5. 输出严格三段，标题固定：## 亮点 / ## 适用场景 / ## 可复用建议；每段 2-3 条，用 - 列表。",
    "6. 中文，全文 250-350 个汉字（硬性上限，超过即不合格）。不要开场白、不要总结。",
  ].join("\n");

  const user = [
    "【案例资料】",
    `标题：${item.title}`,
    `场所类型：${item.space_type}`,
    `年份：${item.year ?? "未提及"}｜地区：${item.region ?? "未提及"}`,
    `面积：${item.area_m2 ?? "未提及"} ㎡｜层高：${item.floor_height_m ?? "未提及"} m｜目标照度：${item.target_lux ?? "未提及"} lx`,
    `预算区间：${item.budget_range ?? "未提及"}`,
    "灯具清单：",
    fixtureLines || "（无）",
    `系统计算：总功率 ${item.total_w ?? "—"} W，功率密度 LPD ${item.lpd ?? "—"} W/㎡`,
    `设计要点：${item.design_points.join("；") || "未提及"}`,
    `项目亮点：${item.highlights.join("；") || "未提及"}`,
    `可复用点：${item.reuse_points.join("；") || "未提及"}`,
    item.raw_text ? `原始资料摘要：${item.raw_text}` : "",
    "",
    "请严格按规则输出三段解读。",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
