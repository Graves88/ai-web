// Prompt 从 v1 开始就带版本号：D7 要做 v1 / v2 对比评测，改 prompt 不许原地改
import type { CaseItem } from "@/lib/cases";

export const PROMPT_VERSION = "v1";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * 把案例数据拼成"喂给模型"的消息。
 * 原则：
 * 1) 只给模型它能判断的信息（不含客户名/精确价 —— 这些在入库前就该脱敏）
 * 2) 计算字段（总功率/LPD）由代码算好直接给它，不让它自己算
 * 3) 明确要求引用原文参数、禁止编造
 */
export function buildInterpretMessages(item: CaseItem): ChatMessage[] {
  const fixtures = item.fixtures
    .map((f) => `- ${f.type}${f.model ? `（${f.model}）` : ""}：${f.watt}W × ${f.qty} 套，${f.lumen ?? "?"}lm，${f.cct ?? "?"}K，Ra${f.cri ?? "?"}${f.layout ? `，${f.layout}` : ""}`)
    .join("\n");

  const system = [
    "你是一位照明设计行业的技术顾问，正在为同事解读一个已落地的照明项目案例。",
    "",
    "硬性规则：",
    "1. 只能引用【案例资料】里出现过的参数；资料没写就写“资料未提及”，绝不编造数字、型号或标准号。",
    "2. 总功率与 LPD 已经由系统算好，直接使用，不要自己重新计算。",
    "3. 输出 Markdown，严格三段，每段 2-4 条：",
    "   ## 亮点",
    "   ## 适用场景",
    "   ## 可复用建议",
    "4. 中文，克制、具体，总字数 300 字以内。不要开场白、不要总结陈词。",
  ].join("\n");

  const user = [
    `【案例资料】`,
    `标题：${item.title}`,
    `场所类型：${item.space_type}`,
    `年份：${item.year ?? "未提及"}｜地区：${item.region ?? "未提及"}`,
    `面积：${item.area_m2 ?? "未提及"} ㎡｜层高：${item.floor_height_m ?? "未提及"} m｜目标照度：${item.target_lux ?? "未提及"} lx`,
    `预算区间：${item.budget_range ?? "未提及"}`,
    `灯具清单：`,
    fixtures || "（无）",
    `系统计算：总功率 ${item.total_w ?? "—"} W，功率密度 LPD ${item.lpd ?? "—"} W/㎡`,
    `设计要点：${item.design_points.join("；") || "未提及"}`,
    `项目亮点：${item.highlights.join("；") || "未提及"}`,
    `可复用点：${item.reuse_points.join("；") || "未提及"}`,
    item.raw_text ? `原始资料摘要：${item.raw_text}` : "",
    "",
    `请按规则输出三段 Markdown 解读。`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
