import { searchKb } from "@/lib/kb";
import { buildAskMessages } from "@/lib/prompts/ask/v1";
import { checkRate, rateInfo } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const API_KEY = process.env.LLM_API_KEY ?? "";
const TIMEOUT_MS = 55_000;
const TOP_K = 8;
const MAX_TOKENS = 900;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

type Source = { doc: string; page: number; title: string | null; url?: string };

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** 无检索结果 / 无 key 时也返回一个合法的 SSE 流，前端逻辑统一 */
function textStream(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(sse({ delta: text })));
      ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export async function POST(req: Request) {
  let body: { question?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const question = (body?.question ?? "").trim();
  if (question.length < 2 || question.length > 200) {
    return Response.json({ error: "问题长度需在 2-200 字之间" }, { status: 400 });
  }

  // —— 限流：防公网被刷 ——
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const rate = checkRate(ip);
  if (!rate.ok) {
    return Response.json({ error: rate.reason, retryAfterSec: rate.retryAfterSec }, { status: 429 });
  }

  // —— 检索 ——
  const hits = searchKb(question, TOP_K);
  if (hits.length === 0) {
    return textStream(
      "资料中没有找到和这个问题相关的内容。可以换个说法，或用型号/系列名再搜一次（例如：天境Lite、晾衣机、520037020800）。",
    );
  }

  const sources: Source[] = hits.map((h) => ({
    doc: h.source.replace(/\.(pptx|xlsx)$/i, ""),
    page: h.page,
    title: h.title,
    url: h.pdfUrl ? `${h.pdfUrl}#page=${h.page}` : undefined,
  }));

  if (!API_KEY) {
    return textStream(
      "服务端还没有配置 LLM_API_KEY，暂时不能生成 AI 回答。可以先看下面的关键词检索结果。",
    );
  }

  // —— 调模型（流式）——
  const controller = new AbortController();
  const onClientAbort = () => controller.abort();
  req.signal.addEventListener("abort", onClientAbort);
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const cleanup = () => {
    clearTimeout(timer);
    req.signal.removeEventListener("abort", onClientAbort);
  };

  // 上游偶发 5xx / 连接抖动：重试一次（评测里遇到过一次 "调用模型失败"）
  const callUpstream = () =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: buildAskMessages(question, hits),
        temperature: 0, // 评测要可复现，固定为 0
        max_tokens: MAX_TOKENS,
        stream: true,
      }),
      signal: controller.signal,
    });

  let upstream: Response;
  try {
    upstream = await callUpstream();
  } catch (err) {
    if (controller.signal.aborted) {
      cleanup();
      return textStream("请求超时了，再试一次？");
    }
    console.warn("[api/ask] 第一次调用失败，重试一次", err instanceof Error ? err.message : String(err));
    try {
      upstream = await callUpstream();
    } catch (err2) {
      cleanup();
      console.error("[api/ask] 重试仍失败", err2 instanceof Error ? err2.message : String(err2));
      return textStream("调用模型失败，稍后再试。");
    }
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    cleanup();
    console.error("[api/ask] upstream status", upstream.status, detail.slice(0, 400));
    return textStream(`模型接口返回 ${upstream.status}，稍后再试。`);
  }

  const encoder = new TextEncoder();
  const upstreamBody = upstream.body;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      ctrl.enqueue(encoder.encode(sse({ sources })));
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta: string | undefined = json?.choices?.[0]?.delta?.content;
                if (delta) ctrl.enqueue(encoder.encode(sse({ delta })));
              } catch {
                /* 半行 JSON，等下一块 */
              }
            }
          }
        }
        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        if (!cancelled) {
          console.error("[api/ask] stream error", err instanceof Error ? err.message : String(err));
          try {
            ctrl.enqueue(encoder.encode(sse({ error: "回答中断了" })));
          } catch {
            /* 已关闭 */
          }
        }
      } finally {
        cleanup();
        try {
          ctrl.close();
        } catch {
          /* 已关闭 */
        }
      }
    },
    cancel() {
      cancelled = true;
      controller.abort();
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  // 调试用：/api/ask?q=xxx 直接返回检索到的片段（不调用模型，便于排查召回问题）
  if (q) {
    const hits = searchKb(q, TOP_K);
    return Response.json({
      question: q,
      topK: TOP_K,
      hits: hits.map((h) => ({
        source: h.source,
        page: h.page,
        title: h.title,
        score: h.score,
        text: h.context.slice(0, 200),
      })),
    });
  }
  return Response.json({
    endpoint: "POST /api/ask",
    body: { question: "string(2-200)" },
    topK: TOP_K,
    rate: rateInfo,
  });
}
