import Link from "next/link";
import { listCases, listFixtures, listRegions, listSpaceTypes } from "@/lib/cases";
import { SPACE_EMOJI, SPACE_GRADIENT, SPACE_TYPES } from "@/lib/constants";

// 每次请求都读数据库（不预渲染成静态页）
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ space?: string; q?: string; city?: string; fixture?: string }>;

// 瀑布流的关键：不同卡片不同高度，视觉上才"活"
function coverAspect(index: number): string {
  const mod = index % 3;
  if (mod === 0) return "aspect-[3/4]";
  if (mod === 1) return "aspect-square";
  return "aspect-[4/5]";
}

export default async function CasesPage({ searchParams }: { searchParams: SearchParams }) {
  // Next 15+ 的 searchParams 和 params 一样是 Promise，必须 await
  const sp = await searchParams;
  const space = (sp.space ?? "").trim();
  const q = (sp.q ?? "").trim();
  const city = (sp.city ?? "").trim();
  const fixture = (sp.fixture ?? "").trim();

  const cases = listCases({
    spaceType: space || undefined,
    region: city || undefined,
    fixture: fixture || undefined,
    keyword: q || undefined,
  });
  const allSpaceTypes = listSpaceTypes();
  const allRegions = listRegions();
  const allFixtures = listFixtures();
  const hasFilter = Boolean(space || q || city || fixture);
  const demo = process.env.DEMO_MODE === "1";

  const hrefWith = (next: { space?: string; q?: string; city?: string; fixture?: string }) => {
    const params = new URLSearchParams();
    const v = {
      space: next.space ?? space,
      q: next.q ?? q,
      city: next.city ?? city,
      fixture: next.fixture ?? fixture,
    };
    if (v.space) params.set("space", v.space);
    if (v.q) params.set("q", v.q);
    if (v.city) params.set("city", v.city);
    if (v.fixture) params.set("fixture", v.fixture);
    const qs = params.toString();
    return qs ? `/cases?${qs}` : "/cases";
  };

  return (
    <main className="min-h-dvh">
      {/* 顶部：品牌 + 搜索 + 场所频道（吸顶 + 毛玻璃） */}
      <div className="sticky top-0 z-20 border-b border-black/[0.04] bg-[var(--background-soft)] backdrop-blur-xl dark:border-white/[0.06]">
        <div className="mx-auto w-full max-w-5xl px-4 pb-2 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold tracking-tight">照明落地案例库</h1>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                {hasFilter ? `筛出 ${cases.length} 条` : `${cases.length} 个案例 · ${allSpaceTypes.length} 类场所`}
                {hasFilter && (
                  <Link href="/cases" className="ml-1.5 underline underline-offset-2">
                    清空
                  </Link>
                )}
                <span className="mx-1">·</span>示例数据已脱敏
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/resources"
                className="inline-flex min-h-9 items-center rounded-full bg-black/[0.05] px-3 text-[13px] font-medium dark:bg-white/[0.08]"
              >
                📎 资料
              </Link>
              {demo ? (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  只读演示
                </span>
              ) : (
                <Link
                  href="/cases/new"
                  className="inline-flex min-h-9 items-center rounded-full bg-[var(--foreground)] px-3.5 text-[13px] font-medium text-[var(--background)]"
                >
                  ＋ 新建
                </Link>
              )}
            </div>
          </div>

          {/* 搜索 */}
          <form action="/cases" method="get" className="mt-2.5 flex items-center gap-2">
            {space && <input type="hidden" name="space" value={space} />}
            {city && <input type="hidden" name="city" value={city} />}
            {fixture && <input type="hidden" name="fixture" value={fixture} />}
            <div className="flex min-h-9 flex-1 items-center gap-2 rounded-full bg-black/[0.04] px-3.5 dark:bg-white/[0.07]">
              <span className="text-[13px] text-[var(--muted)]">🔍</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="搜案例 / 灯具型号 / 城市…"
                inputMode="search"
                className="h-9 w-full bg-transparent text-base outline-none placeholder:text-[var(--muted)] sm:text-[13px]"
              />
            </div>
          </form>

          {/* 场所频道：横向滑动，胶囊式 */}
          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1">
            <Link
              href={hrefWith({ space: "" })}
              className={
                (space ? "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]" : "bg-[var(--foreground)] text-[var(--background)]") +
                " inline-flex min-h-8 shrink-0 items-center rounded-full px-3.5 text-[12.5px]"
              }
            >
              全部
            </Link>
            {SPACE_TYPES.map((t) => {
              const active = space === t;
              return (
                <Link
                  key={t}
                  href={active ? hrefWith({ space: "" }) : hrefWith({ space: t })}
                  className={
                    (active
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]") +
                    " inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-3.5 text-[12.5px]"
                  }
                >
                  <span>{SPACE_EMOJI[t] ?? "📁"}</span>
                  {t}
                </Link>
              );
            })}
          </div>

          {/* 城市 */}
          {allRegions.length > 1 && (
            <div className="no-scrollbar -mx-4 mt-1.5 flex items-center gap-2 overflow-x-auto px-4 pb-1">
              <span className="shrink-0 text-[11px] text-[var(--muted)]">城市</span>
              <Link
                href={hrefWith({ city: "" })}
                className={
                  (city
                    ? "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]"
                    : "bg-[var(--foreground)] text-[var(--background)]") +
                  " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
                }
              >
                全部
              </Link>
              {allRegions.map((r) => {
                const active = city === r;
                return (
                  <Link
                    key={r}
                    href={active ? hrefWith({ city: "" }) : hrefWith({ city: r })}
                    className={
                      (active
                        ? "bg-[var(--foreground)] text-[var(--background)]"
                        : "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]") +
                      " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
                    }
                  >
                    {r}
                  </Link>
                );
              })}
            </div>
          )}

          {/* 灯具型号 / 类型 */}
          {allFixtures.length > 1 && (
            <div className="no-scrollbar -mx-4 mt-1.5 flex items-center gap-2 overflow-x-auto px-4 pb-1">
              <span className="shrink-0 text-[11px] text-[var(--muted)]">灯具</span>
              <Link
                href={hrefWith({ fixture: "" })}
                className={
                  (fixture
                    ? "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]"
                    : "bg-[var(--foreground)] text-[var(--background)]") +
                  " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
                }
              >
                全部
              </Link>
              {allFixtures.map((f) => {
                const active = fixture === f;
                return (
                  <Link
                    key={f}
                    href={active ? hrefWith({ fixture: "" }) : hrefWith({ fixture: f })}
                    className={
                      (active
                        ? "bg-[var(--foreground)] text-[var(--background)]"
                        : "bg-black/[0.04] text-[var(--muted)] dark:bg-white/[0.07]") +
                      " inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-[12px]"
                    }
                  >
                    {f}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 瀑布流：2 列（手机）/3 列（平板）/4 列（桌面） */}
      <div className="mx-auto w-full max-w-5xl px-3 pb-10 pt-3">
        {cases.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-4xl">🗂️</p>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {hasFilter ? "没有匹配的案例" : "还没有案例"}
            </p>
            {hasFilter && (
              <Link href="/cases" className="mt-3 inline-block rounded-full bg-black/[0.05] px-4 py-2 text-[13px] dark:bg-white/[0.08]">
                清空筛选
              </Link>
            )}
          </div>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
            {cases.map((c, i) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="card-surface mb-3 block break-inside-avoid overflow-hidden transition active:scale-[0.985] sm:hover:-translate-y-0.5 sm:hover:shadow-lg"
              >
                {/* 封面：有真实图片就渲染图片，没有则回落到场所色渐变 + emoji */}
                <div
                  className={`relative ${coverAspect(i)} w-full overflow-hidden bg-gradient-to-br ${
                    SPACE_GRADIENT[c.space_type] ?? "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900"
                  }`}
                >
                  {c.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.cover}
                      alt={c.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-4xl drop-shadow-sm sm:text-5xl">{SPACE_EMOJI[c.space_type] ?? "📁"}</span>
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/75 px-2 py-0.5 text-[10.5px] font-medium text-zinc-700 backdrop-blur dark:bg-black/50 dark:text-zinc-200">
                    {c.space_type}
                  </span>
                  {c.year && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[10.5px] text-white backdrop-blur">
                      {c.year}
                    </span>
                  )}
                  {c.media.some((m) => m.type === "video") && (
                    <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-[11px] text-white backdrop-blur">
                      ▶
                    </span>
                  )}
                </div>

                <div className="px-2.5 pb-2.5 pt-2">
                  <h2 className="line-clamp-2 text-[13px] font-medium leading-[1.35]">{c.title}</h2>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                    <span className="truncate">{c.region ?? "—"}</span>
                    <span>·</span>
                    <span className="shrink-0">{c.area_m2 ? `${c.area_m2}㎡` : "面积未填"}</span>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10.5px] text-[var(--muted)] dark:bg-white/[0.07]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-[var(--muted)]">
          {demo ? "只读演示版 · 数据已脱敏 · AI 解读为预生成" : "本地开发环境"}
        </p>
      </div>
    </main>
  );
}
