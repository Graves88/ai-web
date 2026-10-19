import Link from "next/link";
import { listCases, listSpaceTypes } from "@/lib/cases";

// 每次请求都读数据库（不预渲染成静态页）
export const dynamic = "force-dynamic";

const SPACE_EMOJI: Record<string, string> = {
  住宅: "🏠",
  办公: "🏢",
  教育: "🏫",
  商业: "🛍️",
  工业: "🏭",
  景观: "🌳",
  道路: "🛣️",
  医疗: "🏥",
};

export default function CasesPage() {
  const cases = listCases();
  const spaceTypes = listSpaceTypes();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">照明落地案例库</h1>
            <p className="mt-1 text-sm text-zinc-500">
              共 {cases.length} 个案例 · 按场所类型 {spaceTypes.length} 类 · 示例数据已脱敏
            </p>
          </div>
          <Link href="/" className="text-sm text-zinc-500 underline underline-offset-4">
            AI 调试页
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {spaceTypes.map((t) => (
            <span
              key={t}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
            >
              {SPACE_EMOJI[t] ?? "📁"} {t}
            </span>
          ))}
        </div>
      </header>

      {cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          还没有案例。先在终端运行 <code className="mx-1">pnpm seed</code> 导入示例数据。
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
