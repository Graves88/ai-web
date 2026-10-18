"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          `${data.error ?? "请求失败"}${data.detail ? `：${data.detail}` : ""}`,
        );
        return;
      }
      setMessages([...next, { role: "assistant", content: data.content }]);
      if (data.usage) {
        setLastUsage(
          `输入 ${data.usage.prompt_tokens} / 输出 ${data.usage.completion_tokens} / 合计 ${data.usage.total_tokens} tokens`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">AI Web App · Day 1</h1>
        <p className="mt-1 text-sm text-zinc-500">
          最小链路：浏览器 → /api/chat → 模型 → 返回。密钥只在服务端。
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            发一条消息试试，例如：用三句话解释什么是 RAG。
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-sm text-zinc-400">思考中…</p>}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {lastUsage && (
        <p className="mt-2 text-xs text-zinc-400">上次消耗：{lastUsage}</p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="输入消息，回车发送"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          发送
        </button>
      </div>
    </main>
  );
}
