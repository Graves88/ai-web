import Link from "next/link";
import { listPublicResources, listResources } from "@/lib/resources";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import DeleteResourceButton from "./DeleteResourceButton";

export const dynamic = "force-dynamic";

type DisplayItem = {
  key: string;
  title: string;
  description: string;
  category: string;
  sizeKB: number;
  date: string;
  downloadUrl: string;
  isPublic: boolean;
  id?: number;
};

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const category = (sp.c ?? "").trim();
  const demo = process.env.DEMO_MODE === "1";

  // 演示模式：只展示已发布到 public/resources 的公开资料
  // 本地模式：展示全部（公开 + 内部）
  const items: DisplayItem[] = demo
    ? listPublicResources().map((r) => ({
        key: r.url,
        title: r.title,
        description: r.description,
        category: r.category,
        sizeKB: r.sizeKB,
        date: r.updatedAt,
        downloadUrl: r.url,
        isPublic: true,
      }))
    : listResources().map((r) => ({
        key: String(r.id),
        id: r.id,
        title: r.title,
        description: r.description ?? "",
        category: r.category,
        sizeKB: r.size_kb,
        date: r.created_at.slice(0, 10),
        downloadUrl: r.public_url ?? `/api/resources/${r.id}/download`,
        isPublic: r.visibility === "public",
      }));

  const shown = category ? items.filter((i) => i.category === category) : items;
  const categories = RESOURCE_CATEGORIES.filter((c) => items.some((i) => i.category === c));

  return (
    <main className="min-h-dvh">
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">资料中心</h1>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {shown.length} 份资料 · 产品资料 / 在售清单 / 手册 / 规范
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/ask"
              className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3.5 text-[13px] font-medium dark:bg-white/[0.08]"
            >
              🔎 问资料
            </Link>
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
          {categories.map((c) => (
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
        {shown.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-4xl">📎</p>
            <p className="mt-3 text-sm text-[var(--muted)]">{category ? "该分类下暂无资料" : "还没有资料"}</p>
            {!demo && (
              <Link
                href="/resources/upload"
                className="mt-4 inline-block rounded-full bg-[var(--foreground)] px-4 py-2 text-[13px] font-medium text-[var(--background)]"
              >
                上传第一份资料
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {shown.map((r) => (
              <li key={r.key} className="card-surface flex items-start gap-3 p-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-lg dark:bg-white/[0.08]">
                  {r.category === "在售清单" ? "💰" : r.category === "产品资料" ? "📦" : "📄"}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-medium leading-snug">{r.title}</h2>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--muted)]">{r.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-[var(--muted)]">
                    <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 dark:bg-white/[0.07]">{r.category}</span>
                    {!demo && (
                      <span
                        className={
                          r.isPublic
                            ? "rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300"
                            : "rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300"
                        }
                      >
                        {r.isPublic ? "公网可见" : "仅内部"}
                      </span>
                    )}
                    <span>{(r.sizeKB / 1024).toFixed(1)} MB</span>
                    <span>·</span>
                    <span>{r.date}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <a
                    href={r.downloadUrl}
                    download
                    className="inline-flex min-h-9 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[12.5px] font-medium text-[var(--background)]"
                  >
                    下载
                  </a>
                  {!demo && r.id && !r.isPublic && <DeleteResourceButton id={r.id} title={r.title} />}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-black/[0.08] p-4 text-[12px] leading-relaxed text-[var(--muted)] dark:border-white/[0.1]">
          <p className="font-medium text-[var(--foreground)]">{demo ? "关于资料" : "资料发布规则"}</p>
          <p className="mt-1">
            {demo
              ? "这里的产品资料均为可公开的公司宣传材料（不含价格），可自由下载；含价格的内部资料不在公网展示。"
              : "标「公网可见」的资料会发布到 public/resources/（随代码上线，经销商可下载）；标「仅内部」的含价格/客户信息，只在本机可见。"}
          </p>
        </div>
      </div>
    </main>
  );
}
