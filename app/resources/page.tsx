import Link from "next/link";
import { listResources } from "@/lib/resources";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import DeleteResourceButton from "./DeleteResourceButton";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const category = (sp.c ?? "").trim();
  const resources = listResources(category || undefined);
  const demo = process.env.DEMO_MODE === "1";

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">资料中心</h1>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {resources.length} 份资料 · 报价单 / 方案 / 产品资料 / 规范
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/cases"
              className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
            >
              ← 案例库
            </Link>
            {!demo && (
              <Link
                href="/resources/upload"
                className="inline-flex min-h-9 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[13px] font-medium text-[var(--background)]"
              >
                ＋ 上传
              </Link>
            )}
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="no-scrollbar mx-auto flex w-full max-w-5xl gap-2 overflow-x-auto px-4 pb-2">
          <Link
            href="/resources"
            className={
              (category
                ? "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]"
                : "bg-[var(--foreground)] text-[var(--background)]") +
              " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
            }
          >
            全部
          </Link>
          {RESOURCE_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={category === c ? "/resources" : `/resources?c=${encodeURIComponent(c)}`}
              className={
                (category === c
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]") +
                " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
              }
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4">
        {demo ? (
          <div className="mt-16 text-center">
            <p className="text-4xl">🔒</p>
            <p className="mt-3 text-sm font-medium">资料中心为内部资料库</p>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]">
              报价单、方案等文件含客户信息与价格，只能在本地/内网环境访问，公网演示站不提供。
            </p>
            <Link href="/cases" className="mt-4 inline-block rounded-full bg-black/[0.05] px-4 py-2 text-[13px] dark:bg-white/[0.08]">
              回案例库
            </Link>
          </div>
        ) : resources.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-4xl">📎</p>
            <p className="mt-3 text-sm text-[var(--muted)]">还没有资料</p>
            <Link
              href="/resources/upload"
              className="mt-4 inline-block rounded-full bg-[var(--foreground)] px-4 py-2 text-[13px] font-medium text-[var(--background)]"
            >
              上传第一份资料
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {resources.map((r) => (
              <li key={r.id} className="card-surface flex items-start gap-3 p-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-lg dark:bg-white/[0.08]">
                  {r.category === "报价单" ? "💰" : r.category === "方案" ? "📐" : r.category === "现场照片" ? "🖼️" : "📄"}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-medium leading-snug">{r.title}</h2>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted)]">{r.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--muted)]">
                    <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 dark:bg-white/[0.07]">{r.category}</span>
                    <span>{r.size_kb} KB</span>
                    <span>·</span>
                    <span>{r.created_at.slice(0, 10)}</span>
                    <span className="truncate">· {r.original_name}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <a
                    href={`/api/resources/${r.id}/download`}
                    className="inline-flex min-h-9 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[12.5px] font-medium text-[var(--background)]"
                  >
                    下载
                  </a>
                  <DeleteResourceButton id={r.id} title={r.title} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-[11px] text-[var(--muted)]">
          {demo ? "只读演示版" : "本地环境 · 文件存于 data/resources/（不进 git）"}
        </p>
      </div>
    </main>
  );
}
