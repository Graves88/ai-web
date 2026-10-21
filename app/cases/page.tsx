import Link from "next/link";
import { listCases, listSpaceTypes } from "@/lib/cases";
import { SPACE_EMOJI, SPACE_TYPES } from "@/lib/constants";

// 每次请求都读数据库（不预渲染成静态页）
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ space?: string; q?: string }>;

export default async function CasesPage({ searchParams }: { searchParams: SearchParams }) {
  // Next 15+ 的 searchParams 和 params 一样是 Promise，必须 await
  const sp = await searchParams;
  const space = (sp.space ?? "").trim();
  const q = (sp.q ?? "").trim();

  const cases = listCases({ spaceType: space || undefined, keyword: q || undefined });
  const allSpaceTypes = listSpaceTypes();
  const hasFilter = Boolean(space || q);
  const demo = process.env.DEMO_MODE === "1";

  // 保留搜索词/筛选条件的辅助函数
  const hrefWith = (next: { space?: string; q?: string }) => {
    const params = new URLSearchParams();
    const nextSpace = next.space ?? space;
    const nextQ = next.q ?? q;
    if (nextSpace) params.set("space", nextSpace);
    if (nextQ) params.set("q", nextQ);
    const qs = params.toString();
    return qs ? `/cases?${qs}` : "/cases";
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">照明落地案例库</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {hasFilter ? (
                <>
                  筛选结果 <b>{cases.length}</b> 条
                  {space && <> · 场所：{space}</>}
                  {q && <> · 关键词：{q}</>}
                </>
              ) : (
                <>
                  共 {cases.length} 个案例 · 按场所类型 {allSpaceTypes.length} 类 · 示例数据已脱敏
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {demo ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                只读演示版
              </span>
            ) : (
              <Link href="/cases/new" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black">
                ＋ 新建案例
              </Link>
            )}
            {!demo && (
              <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4">
                AI 调试页
              </Link>
            )}
          </div>
        </div>

        {/* 搜索 + 场所类型筛选（纯 URL 驱动，可分享、可后退） */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form action="/cases" method="get" className="flex items-center gap-2">
            {space && <input type="hidden" name="space" value={space} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="搜索标题或原始资料…"
              className="w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
              搜索
            </button>
          </form>

          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

          {SPACE_TYPES.map((t) => {
            const active = space === t;
            return (
              <Link
                key={t}
                href={active ? hrefWith({ space: "" }) : hrefWith({ space: t })}
                className={
                  active
                    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-black"
                    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }
              >
                {SPACE_EMOJI[t] ?? "📁"} {t}
              </Link>
            );
          })}

          {hasFilter && (
            <Link href="/cases" className="text-xs text-zinc-500 underline underline-offset-4">
              清空筛选
            </Link>
          )}
        </div>
      </header>

      {cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          {hasFilter ? (
            <>
              没有匹配的案例，<Link href="/cases" className="underline underline-offset-4">清空筛选</Link> 看看全部。
            </>
          ) : (
            <>
              还没有案例。先在终端运行 <code className="mx-1">pnpm seed</code> 导入示例数据，或点右上角「新建案例」。
            </>
          )}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/cases/${c.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800"
              >
                {/* D6 会换成真实封面图；现在先用色块占位 */}
                <div className="flex h-28 items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-3xl dark:from-zinc-800 dark:to-zinc-900">
                  {SPACE_EMOJI[c.space_type] ?? "📁"}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="line-clamp-2 text-sm font-medium group-hover:underline">{c.title}</h2>
                  <p className="text-xs text-zinc-500">
                    {c.region ?? "—"} · {c.year ?? "—"} 年 · {c.area_m2 ? `${c.area_m2} ㎡` : "面积未填"}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
