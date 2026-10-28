import Link from "next/link";
import { kbStats, searchKb } from "@/lib/kb";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const demo = process.env.DEMO_MODE === "1";
  const stats = kbStats();
  const hits = q ? searchKb(q) : [];

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">问资料</h1>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {stats.docs} 份文档 · {stats.chunks} 个文本块 · {(stats.chars / 10000).toFixed(1)} 万字
              {demo && <span className="ml-1">（公开资料版）</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/resources"
              className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
            >
              资料中心
            </Link>
            <Link
              href="/cases"
              className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
            >
              案例库
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-3">
          <form action="/ask" method="get" className="flex items-center gap-2">
            <div className="flex min-h-11 flex-1 items-center gap-2 rounded-full bg-black/[0.05] px-4 dark:bg-white/[0.08]">
              <span className="text-[14px] text-[var(--muted)]">🔎</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="搜产品型号 / 卖点 / 参数，如：晾衣机、520037020800、天境Lite"
                className="h-11 w-full bg-transparent text-base outline-none placeholder:text-[var(--muted)] sm:text-[14px]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-[var(--foreground)] px-4 text-[13px] font-medium text-[var(--background)]"
            >
              搜索
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4">
        {
          <>
            {!q && (
              <div className="rounded-2xl border border-dashed border-black/[0.08] p-5 text-[12.5px] leading-relaxed text-[var(--muted)] dark:border-white/[0.1]">
                <p className="font-medium text-[var(--foreground)]">能搜什么？</p>
                <ul className="mt-2 space-y-1">
                  <li>· 产品型号/物料代码：<code className="rounded bg-black/[0.05] px-1">520037020800</code></li>
                  <li>· 产品系列：<code className="rounded bg-black/[0.05] px-1">天境Lite</code>、<code className="rounded bg-black/[0.05] px-1">星II</code></li>
                  <li>· 场景/卖点：<code className="rounded bg-black/[0.05] px-1">晾衣机</code>、<code className="rounded bg-black/[0.05] px-1">无主灯</code></li>
                </ul>
                <p className="mt-3">命中结果会给出「文档 + 页码 + 原文片段」，可跳到 PDF 对应页。</p>
              </div>
            )}

            {q && hits.length === 0 && (
              <p className="mt-10 text-center text-sm text-[var(--muted)]">
                没搜到「{q}」，换个关键词试试（型号/系列/场景）
              </p>
            )}

            {q && hits.length > 0 && (
              <>
                <p className="mb-3 text-[12px] text-[var(--muted)]">
                  命中 {hits.length} 处 · 按相关度排序
                </p>
                <ul className="space-y-3">
                  {hits.map((h, i) => (
                    <li key={`${h.docId}-${h.page}-${i}`} className="card-surface p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium leading-snug">
                            {h.source.replace(/\.(pptx|xlsx)$/i, "")}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--muted)]">
                            第 {h.page} 页{h.title ? ` · ${h.title}` : ""}
                          </p>
                        </div>
                        {h.pdfUrl && (
                          <a
                            href={`${h.pdfUrl}#page=${h.page}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-[var(--foreground)] px-3 text-[12px] font-medium text-[var(--background)]"
                          >
                            看原文
                          </a>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-[var(--muted)]">
                        {h.snippet}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        }
      </div>
    </main>
  );
}
