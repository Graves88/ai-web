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

/** 极简 Markdown：只处理 ## 标题、- 列表、**粗体**（够用就好，不引依赖） */
function renderInline(s: string, keyPrefix: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

function renderMarkdown(text: string) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (!bullets.length) return;
    out.push(
      <ul key={key} className="list-disc space-y-1 pl-5 marker:text-[var(--muted)]">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  text.split("\n").forEach((line, idx) => {
    const t = line.trim();
    if (!t) {
      flush(`b${idx}`);
      return;
    }
    if (/^#{1,3}\s/.test(t)) {
      flush(`b${idx}`);
      out.push(
        <h3 key={`h${idx}`} className="mt-3 text-[13.5px] font-semibold text-[var(--foreground)] first:mt-0">
          {renderInline(t.replace(/^#{1,3}\s/, ""), `h${idx}`)}
        </h3>,
      );
      return;
    }
    if (/^[-*]\s/.test(t)) {
      bullets.push(t.slice(2));
      return;
    }
    flush(`b${idx}`);
    out.push(<p key={`p${idx}`}>{renderInline(t, `p${idx}`)}</p>);
  });
  flush("b-end");
  return out;
}

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
    <section className="card-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <span>🤖</span> AI 解读
        </h2>
        <div className="flex items-center gap-2">
          {busy ? (
            <button
              onClick={stop}
              className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[12.5px] font-medium dark:bg-white/[0.08]"
            >
              停止生成
            </button>
          ) : (
            <button
              onClick={() => void start()}
              className="inline-flex min-h-9 items-center rounded-full bg-[var(--foreground)] px-4 text-[12.5px] font-medium text-[var(--background)]"
            >
              {text ? "重新生成" : "生成解读"}
            </button>
          )}
        </div>
      </div>

      {text ? (
        <div className="mt-3.5 space-y-2.5 text-[13.5px] leading-6 text-zinc-700 dark:text-zinc-200">
          {renderMarkdown(text)}
          {busy && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-current align-middle" />}
        </div>
      ) : (
        <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
          点「生成解读」：模型会基于本案例资料输出「亮点 / 适用场景 / 可复用建议」，要求引用原文参数、不许编造。
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--muted)]">
        <span>{phase === "error" ? "" : PHASE_TEXT[phase]}</span>
        <span>{demo ? "演示：预生成解读（不调模型）" : "prompt v1 · 流式输出"}</span>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
