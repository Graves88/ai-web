import Link from "next/link";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type Resource = {
  title: string;
  description: string;
  url: string;
  sizeKB: number;
  updatedAt: string;
  tags: string[];
};

function loadResources(): Resource[] {
  try {
    const file = path.join(process.cwd(), "seed", "resources.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as Resource[];
  } catch {
    return [];
  }
}

export default async function ResourcesPage() {
  const resources = loadResources();
  const demo = process.env.DEMO_MODE === "1";

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">资料中心</h1>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {resources.length} 份资料 · 产品参数 / 规范手册 / 模板
            </p>
          </div>
          <Link
            href="/cases"
            className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
          >
            ← 回案例库
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4">
        {resources.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-4xl">📎</p>
            <p className="mt-3 text-sm text-[var(--muted)]">还没有资料</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {resources.map((r) => (
              <li key={r.url} className="card-surface flex items-start gap-3 p-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-lg dark:bg-white/[0.08]">
                  📄
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-medium leading-snug">{r.title}</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{r.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {r.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10.5px] text-[var(--muted)] dark:bg-white/[0.07]"
                      >
                        #{t}
                      </span>
                    ))}
                    <span className="text-[10.5px] text-[var(--muted)]">
                      {r.sizeKB} KB · 更新于 {r.updatedAt}
                    </span>
                  </div>
                </div>
                <a
                  href={r.url}
                  download
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[12.5px] font-medium text-[var(--background)]"
                >
                  下载
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.08] p-4 text-[12px] leading-relaxed text-[var(--muted)] dark:border-white/[0.1]">
          <p className="font-medium text-[var(--foreground)]">下一步（W3 资料库）</p>
          <p className="mt-1">
            这里是"文件入口"的第一版：先能浏览、下载。接下来会做上传（本地 SQLite 模式下）、按标签筛选，
            并把 PDF 内容切分入库，让 AI 能引用资料回答问题。
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--muted)]">
          {demo ? "只读演示版 · 资料为示例文件" : "本地开发环境"}
        </p>
      </div>
    </main>
  );
}
