"use client";

import { useRef, useState } from "react";

type Phase = "idle" | "loading" | "done" | "stopped" | "error";

const PHASE_TEXT: Record<Phase, string> = {
  idle: "",
  loading: "生成中…",
  done: "已完成",
  stopped: "已停止（已生成部分仍会计费）",
  error: "",
};

export default function InterpretPanel({ caseId, demo = false }: { caseId: number; demo?: boolean }) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setText("");
    setError(null);
    setPhase("loading");

    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `请求失败（HTTP ${res.status}）`);
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            setPhase("done");
            return;
          }
          try {
            const json = JSON.parse(payload) as { delta?: string; error?: string };
            if (json.error) {
              setError(json.error);
              setPhase("error");
              return;
            }
            if (json.delta) {
              acc += json.delta;
              setText(acc);
            }
          } catch {
            // 半行 JSON，忽略
          }
        }
      }
      setPhase("done");
    } catch (err) {
      if (ac.signal.aborted) {
        setPhase("stopped");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setPhase("stopped");
  }

  const busy = phase === "loading";

  return (
    <section className="mt-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">AI 解读</h2>
        <div className="flex items-center gap-2">
          {busy ? (
            <button
              onClick={stop}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              停止生成
            </button>
          ) : (
            <button
              onClick={() => void start()}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white hover:opacity-90 dark:bg-white dark:text-black"
            >
              {text ? "重新生成" : "生成解读"}
            </button>
          )}
        </div>
      </div>

      {text ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">{text}</p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          点「生成解读」：模型会基于本案例资料输出「亮点 / 适用场景 / 可复用建议」，要求引用原文参数、不许编造。
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{phase === "error" ? "" : PHASE_TEXT[phase]}</span>
        <span>{demo ? "演示：预生成解读（不调模型）" : "prompt v1 · 流式输出"}</span>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
