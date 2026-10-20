import { getCase } from "@/lib/cases";
import { buildInterpretMessages } from "@/lib/prompts/interpret/v1";

export const runtime = "nodejs";
// Vercel 上单次函数执行上限（免费/Pro 不同，给个保守值）
export const maxDuration = 60;

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const API_KEY = process.env.LLM_API_KEY ?? "";
const TIMEOUT_MS = 60_000;

/**
 * POST /api/interpret  { caseId: number }
 * 返回 SSE 流：每行形如  data: {"delta":"一段文字"}
 * 结束标记：data: [DONE]
 */
export async function POST(req: Request) {
  if (!API_KEY) {
    return Response.json({ error: "服务端未配置 LLM_API_KEY" }, { status: 500 });
  }

  let body: { caseId?: number } | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const caseId = Number(body?.caseId);
  if (!Number.isInteger(caseId) || caseId <= 0) {
    return Response.json({ error: "caseId 必须是正整数" }, { status: 400 });
  }

  const item = getCase(caseId);
  if (!item) {
    return Response.json({ error: `案例 ${caseId} 不存在` }, { status: 404 });
  }

  // 浏览器断开（点了"停止生成"）时，req.signal 会触发；用它去中止上游请求，避免白烧 token
  const controller = new AbortController();
  const onClientAbort = () => controller.abort();
  req.signal.addEventListener("abort", onClientAbort);
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const cleanup = () => {
    clearTimeout(timer);
    req.signal.removeEventListener("abort", onClientAbort);
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: buildInterpretMessages(item),
        temperature: 0.4,
        stream: true, // ← 关键：让上游也流式返回
      }),
      signal: controller.signal,
    });
  } catch (err) {
    cleanup();
    const aborted = controller.signal.aborted;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/interpret] upstream fetch failed", msg);
    return Response.json(
      { error: aborted ? "上游超时或被中止" : "调用模型失败", detail: msg.slice(0, 200) },
      { status: aborted ? 504 : 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    cleanup();
    console.error("[api/interpret] upstream status", upstream.status, text.slice(0, 500));
    return Response.json({ error: `模型接口返回 ${upstream.status}` }, { status: 502 });
  }

  // 把上游的 SSE 翻译成我们自己的 SSE：只挑 delta.content，不带其他字段
  const encoder = new TextEncoder();
  const upstreamBody = upstream.body;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? ""; // 最后一段可能不完整，留到下次
          for (const event of events) {
            for (const line of event.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              if (payload === "[DONE]") {
                ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const json = JSON.parse(payload);
                const delta: string | undefined = json?.choices?.[0]?.delta?.content;
                if (delta) {
                  ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              } catch {
                // 上游偶发半行 JSON：忽略，等下一块拼完整
              }
            }
          }
        }
        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        // 客户端主动停止（cancel）也会走到这里：那不是错误，不打印也不下发 error
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[api/interpret] stream error", msg);
          try {
            ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "上游流中断" })}\n\n`));
          } catch {
            /* 流已被关闭 */
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
      // 客户端取消读流：立刻中止上游，不再计费
      cancelled = true;
      controller.abort();
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 让 Nginx 之类不要缓冲
    },
  });
}
