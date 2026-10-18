import { NextResponse } from "next/server";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const API_KEY = process.env.LLM_API_KEY ?? "";
const TIMEOUT_MS = 60_000;

export async function POST(req: Request) {
  // 1) 配置检查：密钥只从服务端环境变量读，永不进前端
  if (!API_KEY) {
    return NextResponse.json(
      { error: "服务端未配置 LLM_API_KEY：请在 .env.local 里填写后重启 dev server" },
      { status: 500 },
    );
  }

  // 2) 入参校验
  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "messages 不能为空" }, { status: 400 });
  }

  // 3) 调用模型（OpenAI 兼容接口，超时 60s 可中止）
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.7 }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[api/chat] model status", res.status, text.slice(0, 500));
      return NextResponse.json(
        { error: `模型接口返回 ${res.status}`, detail: text.slice(0, 300) },
        { status: 502 },
      );
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    // usage 先返回给前端看一眼，后面做成本记账要用
    return NextResponse.json({
      content,
      model: data?.model ?? MODEL,
      usage: data?.usage ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const aborted = controller.signal.aborted;
    console.error("[api/chat] fetch failed", msg);
    return NextResponse.json(
      {
        error: aborted ? `模型超时（${TIMEOUT_MS / 1000}s）` : "调用模型失败",
        detail: msg.slice(0, 300),
      },
      { status: aborted ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
