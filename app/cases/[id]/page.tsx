import Link from "next/link";
import { notFound } from "next/navigation";
import { calcTotals, getCase } from "@/lib/cases";
import { SPACE_EMOJI, SPACE_GRADIENT } from "@/lib/constants";
import InterpretPanel from "./InterpretPanel";
import DeleteCaseButton from "./DeleteCaseButton";

export const dynamic = "force-dynamic";

function Section({ title, emoji, items }: { title: string; emoji: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="card-surface p-4">
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold">
        <span>{emoji}</span>
        {title}
      </h2>
      <ul className="space-y-1.5 text-[13.5px] leading-6 text-zinc-600 dark:text-zinc-300">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getCase(Number(id));
  if (!item) notFound();

  const totals = calcTotals(item.fixtures, item.area_m2);
  const demo = process.env.DEMO_MODE === "1";
  const fixtureCount = item.fixtures.reduce((s, f) => s + (Number(f.qty) || 0), 0);
  const images = item.media.filter((m) => m.type === "image");
  const videos = item.media.filter((m) => m.type === "video");

  const specs: [string, string][] = [
    ["场所", item.space_type],
    ["年份", item.year ? `${item.year}` : "—"],
    ["地区", item.region ?? "—"],
    ["面积", item.area_m2 ? `${item.area_m2}㎡` : "—"],
    ["层高", item.floor_height_m ? `${item.floor_height_m}m` : "—"],
    ["目标照度", item.target_lux ? `${item.target_lux}lx` : "—"],
    ["预算", item.budget_range ?? "—"],
    ["灯具", `${fixtureCount} 套`],
    ["总功率", totals.total_w ? `${totals.total_w}W` : "—"],
    ["LPD", totals.lpd !== null ? `${totals.lpd}W/㎡` : "—"],
  ];

  return (
    <main className="min-h-dvh">
      {/* 封面：有真实图片就用图片，否则回落到场所色渐变 + emoji */}
      <div
        className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-br sm:aspect-[21/9] ${
          SPACE_GRADIENT[item.space_type] ?? "from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900"
        }`}
      >
        {item.cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.cover} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/20" />
          </>
        ) : (
          <span className="text-6xl drop-shadow sm:text-7xl">{SPACE_EMOJI[item.space_type] ?? "📁"}</span>
        )}

        <Link
          href="/cases"
          className="absolute left-3 top-3 inline-flex h-9 items-center gap-1 rounded-full bg-white/80 px-3 text-[13px] font-medium text-zinc-800 backdrop-blur dark:bg-black/50 dark:text-zinc-100"
        >
          ← 案例库
        </Link>

        <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-white backdrop-blur">
          {item.space_type} · {item.year ?? "—"}
        </span>

        {demo && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-amber-700 backdrop-blur dark:bg-black/50 dark:text-amber-300">
            只读演示版
          </span>
        )}
      </div>

      {/* 内容浮到封面上，形成"卡片上浮"层次 */}
      <div className="relative -mt-5 rounded-t-3xl bg-[var(--background)] px-4 pb-10 pt-4">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[19px] font-semibold leading-snug tracking-tight sm:text-2xl">{item.title}</h1>
            {!demo && (
              <div className="flex shrink-0 items-center gap-1.5 pt-1">
                <Link
                  href={`/cases/${item.id}/edit`}
                  className="inline-flex min-h-8 items-center rounded-full bg-black/[0.05] px-3 text-[12px] dark:bg-white/[0.08]"
                >
                  编辑
                </Link>
                <DeleteCaseButton id={item.id} title={item.title} />
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--muted)]">
            <span>📍 {item.region ?? "地区未填"}</span>
            <span>·</span>
            <span>{item.area_m2 ? `${item.area_m2}㎡` : "面积未填"}</span>
            <span>·</span>
            <span>{fixtureCount} 套灯具</span>
            <span>·</span>
            <span>{item.status}</span>
          </div>

          {item.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11.5px] text-[var(--muted)] dark:bg-white/[0.07]">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 关键参数：两列小卡 */}
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {specs.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-black/[0.03] px-3 py-2 dark:bg-white/[0.05]">
                <dt className="text-[10.5px] text-[var(--muted)]">{k}</dt>
                <dd className="mt-0.5 truncate text-[13.5px] font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {/* 相册（点击看大图） */}
          {images.length > 1 && (
            <section className="card-surface mt-4 p-3">
              <h2 className="px-1 text-[13px] font-semibold">📷 现场与效果（{images.length} 张）</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {images.map((m, i) => (
                  <a
                    key={m.url + i}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-black/[0.04]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.title ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    {m.title && (
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-[10.5px] text-white">
                        {m.title}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 视频：mp4 直接播；其它（B站/腾讯等）用 iframe 嵌入 */}
          {videos.length > 0 && (
            <section className="card-surface mt-4 p-3">
              <h2 className="px-1 text-[13px] font-semibold">🎬 现场视频</h2>
              <div className="mt-2 space-y-2">
                {videos.map((m, i) =>
                  /\.(mp4|webm|ogg)(\?|$)/i.test(m.url) ? (
                    <video
                      key={i}
                      controls
                      playsInline
                      preload="none"
                      poster={m.poster ?? undefined}
                      src={m.url}
                      className="w-full rounded-xl bg-black"
                    />
                  ) : (
                    <iframe
                      key={i}
                      src={m.url}
                      title={m.title ?? "视频"}
                      allowFullScreen
                      className="aspect-video w-full rounded-xl border-0"
                    />
                  ),
                )}
                {videos[0]?.title && <p className="px-1 text-[11px] text-[var(--muted)]">{videos[0].title}</p>}
              </div>
            </section>
          )}

          {/* 灯具清单 */}
          <section className="card-surface mt-4 p-4">
            <h2 className="mb-3 flex items-center justify-between text-[13px] font-semibold">
              <span>💡 灯具清单</span>
              <span className="text-[11px] font-normal text-[var(--muted)]">{fixtureCount} 套</span>
            </h2>

            {/* 手机：卡片 */}
            <ul className="space-y-2 sm:hidden">
              {item.fixtures.map((f, i) => (
                <li key={i} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13.5px] font-medium">{f.type}</span>
                    <span className="shrink-0 text-[13px] font-medium">
                      {f.watt}W × {f.qty}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--muted)]">
                    {f.model ?? "型号未填"} · {f.lumen ?? "—"}lm · {f.cct ?? "—"}K · Ra{f.cri ?? "—"}
                  </p>
                  {f.layout && <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">布置：{f.layout}</p>}
                </li>
              ))}
            </ul>

            {/* 桌面：表格 */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-[13px]">
                <thead className="text-[11px] text-[var(--muted)]">
                  <tr>
                    <th className="py-2 pr-3">类型</th>
                    <th className="py-2 pr-3">型号</th>
                    <th className="py-2 pr-3">功率</th>
                    <th className="py-2 pr-3">光通量</th>
                    <th className="py-2 pr-3">色温/CRI</th>
                    <th className="py-2 pr-3">数量</th>
                    <th className="py-2">布置</th>
                  </tr>
                </thead>
                <tbody>
                  {item.fixtures.map((f, i) => (
                    <tr key={i} className="border-t border-black/[0.06] dark:border-white/[0.08]">
                      <td className="py-2 pr-3">{f.type}</td>
                      <td className="py-2 pr-3 text-[var(--muted)]">{f.model ?? "—"}</td>
                      <td className="py-2 pr-3">{f.watt} W</td>
                      <td className="py-2 pr-3 text-[var(--muted)]">{f.lumen ?? "—"} lm</td>
                      <td className="py-2 pr-3 text-[var(--muted)]">
                        {f.cct ?? "—"}K / Ra{f.cri ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{f.qty}</td>
                      <td className="py-2 text-[var(--muted)]">{f.layout ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] text-[var(--muted)]">
              总功率与 LPD 由代码从清单求和计算，不经过大模型——这是本项目的第一原则。
            </p>
          </section>

          {/* 要点 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Section title="设计要点" emoji="📐" items={item.design_points} />
            <Section title="项目亮点" emoji="✨" items={item.highlights} />
            <Section title="可复用点" emoji="🔁" items={item.reuse_points} />
          </div>

          {/* AI 解读 */}
          <div className="mt-4">
            <InterpretPanel caseId={item.id} demo={demo} />
          </div>

          {item.raw_text && (
            <details className="card-surface mt-4 p-4">
              <summary className="cursor-pointer text-[13px] font-semibold">📄 原始资料（已脱敏）</summary>
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-zinc-600 dark:text-zinc-300">
                {item.raw_text}
              </p>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
