import Link from "next/link";
import { notFound } from "next/navigation";
import { calcTotals, getCase } from "@/lib/cases";
import InterpretPanel from "./InterpretPanel";

export const dynamic = "force-dynamic";

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
        {items.map((t) => (
          <li key={t}>{t}</li>
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

  const specs: [string, string][] = [
    ["场所类型", item.space_type],
    ["项目年份", item.year ? `${item.year}` : "—"],
    ["地区", item.region ?? "—"],
    ["面积", item.area_m2 ? `${item.area_m2} ㎡` : "—"],
    ["层高", item.floor_height_m ? `${item.floor_height_m} m` : "—"],
    ["目标照度", item.target_lux ? `${item.target_lux} lx` : "—"],
    ["预算区间", item.budget_range ?? "—"],
    ["灯具数量", `${item.fixtures.reduce((s, f) => s + (Number(f.qty) || 0), 0)} 套`],
    ["总功率（代码计算）", totals.total_w ? `${totals.total_w} W` : "—"],
    ["功率密度 LPD（代码计算）", totals.lpd !== null ? `${totals.lpd} W/㎡` : "—"],
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/cases" className="text-sm text-zinc-500 underline underline-offset-4">
          ← 返回案例列表
        </Link>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {item.status} · {item.visibility}
        </span>
      </div>

      <h1 className="text-2xl font-semibold">{item.title}</h1>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.tags.map((t) => (
          <span key={t} className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {t}
          </span>
        ))}
      </div>

      {/* 关键参数 */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {specs.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-[11px] text-zinc-500">{k}</dt>
            <dd className="mt-1 text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      {/* 灯具清单 */}
      <section className="mt-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold">灯具清单</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-zinc-500">
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
                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 pr-3">{f.type}</td>
                  <td className="py-2 pr-3 text-zinc-500">{f.model ?? "—"}</td>
                  <td className="py-2 pr-3">{f.watt} W</td>
                  <td className="py-2 pr-3 text-zinc-500">{f.lumen ?? "—"} lm</td>
                  <td className="py-2 pr-3 text-zinc-500">
                    {f.cct ?? "—"}K / Ra{f.cri ?? "—"}
                  </td>
                  <td className="py-2 pr-3">{f.qty}</td>
                  <td className="py-2 text-zinc-500">{f.layout ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          总功率与 LPD 由代码从清单求和计算，不经过大模型——这是本项目的第一原则。
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Section title="设计要点" items={item.design_points} />
        <Section title="项目亮点" items={item.highlights} />
        <Section title="可复用点" items={item.reuse_points} />
      </div>

      {/* AI 解读：客户端组件，走 /api/interpret 的 SSE 流 */}
      <InterpretPanel caseId={item.id} />

      {item.raw_text && (
        <details className="mt-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-semibold">原始资料（已脱敏）</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300">{item.raw_text}</p>
        </details>
      )}
    </main>
  );
}
