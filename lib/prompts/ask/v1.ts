// RAG 问答 prompt v1：只基于检索到的资料回答，并强制标注出处
import type { KbHit } from "@/lib/kb";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function buildAskMessages(question: string, hits: KbHit[]): ChatMessage[] {
  const system = [
    "你是欧普照明（OPPLE）的资料助手，只根据【资料片段】回答问题。",
    "",
    "【硬性规则】",
    "1. 只能使用【资料片段】里的信息；不要猜测、不要补充行业常识。",
    "2. 每条结论后必须标注出处，格式：〔文档名 第X页〕，例如 〔零售渠道-2026晾衣机&台灯新品发布 第12页〕。",
    "3. 如果多个片段信息冲突，指出冲突并分别标注出处。",
    "4. 中文，总字数 400 字以内，不要开场白，直接回答。",
    "5.【最重要】资料只给出部分信息时，先直接回答「已经给出的部分」（必须带页码），再用一句话说明「其余信息资料未提及」。",
    "   不要因为信息不完整就整题拒答；只有片段里完全没有任何相关信息时，才整题回答“资料中未提及”。",
  ].join("\n");

  const context = hits
    .map((h, i) => {
      const doc = h.source.replace(/\.(pptx|xlsx)$/i, "");
      return `【片段${i + 1}】文档：${doc} 第${h.page}页\n${h.context ?? h.snippet}`;
    })
    .join("\n\n");

  const user = [`【资料片段】`, context, "", `【问题】${question}`].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export const ASK_PROMPT_VERSION = "v1";
