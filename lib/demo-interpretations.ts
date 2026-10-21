import data from "@/seed/demo-interpretations.json";

/**
 * 演示版的"预生成 AI 解读"：本地用真实模型跑好、结果提交进仓库。
 * 好处：公网 demo 不需要 LLM_API_KEY，陌生人也刷不掉你的余额。
 */
const map = data as Record<string, string>;

export function getDemoInterpretation(caseId: number): string | null {
  return map[String(caseId)] ?? null;
}
