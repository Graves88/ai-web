"use client";

import { useRef, useState } from "react";

type Source = { doc: string; page: number; title: string | null; url?: string };

type Phase = "idle" | "loading" | "done" | "stopped" | "error";

export default function AskForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    const q = question.trim();
    if (q.length < 2) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAnswer("");
    setSources([]);
    setErr("");
    setPhase("loading");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data.error ?? `请求失败（${res.status}）`);
        setPhase("error");
        return;
      }
      if (!res.body) {
        setErr("没有收到响应流");
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
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload) as { delta?: string; sources?: Source[]; error?: string };
              if (json.sources) setSources(json.sources);
              if (json.error) setErr(json.error);
              if (json.delta) {
                acc += json.delta;
                setAnswer(acc);
              }
            } catch {
              /* 半行 */
            }
          }
        }
      }
      setPhase((p) => (p === "loading" ? "done" : p));
    } catch (e) {
      if (ctrl.signal.aborted) {
        setPhase("stopped");
      } else {
        setErr(e instanceof Error ? e.message : "请求出错");
        setPhase("error");
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
    setPhase("stopped");
  }

  const busy = phase === "loading";

  return (
    <div className="card-surface p-3.5">
      <form onSubmit={ask} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px]">💬</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={200}
            placeholder="问一句，例如：晾衣机有哪些新品？天境Lite 功率多大？"
            className="h-10 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--muted)] sm:text-[13.5px]"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-black/[0.1] px-3.5 text-[12.5px] font-medium dark:border-white/[0.15]"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={question.trim().length < 2}
              className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[12.5px] font-medium text-[var(--background)] disabled:opacity-40"
            >
              问
            </button>
          )}
        </div>
        {err && <p className="text-[12px] text-red-600 dark:text-red-400">{err}</p>}
      </form>

      {(phase === "loading" || answer || phase === "stopped") && (
        <div className="mt-3 border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            {busy ? "正在检索资料并生成回答…" : phase === "stopped" ? "已停止生成" : "AI 回答（基于资料，含出处）"}
          </p>
          <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
            {answer}
            {busy && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[var(--foreground)] align-middle" />}
          </div>

          {sources.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-medium text-[var(--muted)]">引用来源</p>
              <ul className="mt-1.5 space-y-1">
                {sources.map((s, i) => (
                  <li key={`${s.doc}-${s.page}-${i}`} className="text-[11.5px] text-[var(--muted)]">
                    {i + 1}. {s.doc.replace(/\.(pptx|xlsx)$/i, "")} 第 {s.page} 页
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="ml-1 underline underline-offset-2">
                        看原文
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
