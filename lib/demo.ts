import { calcTotals } from "./calc";
import type { CaseItem, Fixture } from "./cases";
import seed from "@/seed/cases.json";

/**
 * 演示模式（DEMO_MODE=1）的数据源：只读的 seed/cases.json。
 * 目的：公网 demo 不碰 SQLite（Vercel 文件系统只读）、也不暴露真实数据。
 * 注意：这里的 id 是按数组顺序生成的（1..N），与 seed 文件顺序绑定。
 */

type SeedCase = {
  title: string;
  space_type: string;
  year?: number | null;
  region?: string | null;
  area_m2?: number | null;
  floor_height_m?: number | null;
  target_lux?: number | null;
  fixtures?: Fixture[];
  budget_range?: string | null;
  design_points?: string[];
  highlights?: string[];
  reuse_points?: string[];
  raw_text?: string | null;
  status?: string;
  visibility?: string;
  tags?: string[];
};

const seedCases = seed as SeedCase[];

let cache: CaseItem[] | null = null;

function toItems(): CaseItem[] {
  if (cache) return cache;
  cache = seedCases.map((c, i) => {
    const fixtures = c.fixtures ?? [];
    const totals = calcTotals(fixtures, c.area_m2 ?? null);
    return {
      id: i + 1,
      title: c.title,
      space_type: c.space_type,
      year: c.year ?? null,
      region: c.region ?? null,
      area_m2: c.area_m2 ?? null,
      floor_height_m: c.floor_height_m ?? null,
      target_lux: c.target_lux ?? null,
      fixtures,
      total_w: totals.total_w,
      lpd: totals.lpd,
      budget_range: c.budget_range ?? null,
      design_points: c.design_points ?? [],
      highlights: c.highlights ?? [],
      reuse_points: c.reuse_points ?? [],
      raw_text: c.raw_text ?? null,
      status: c.status ?? "已确认",
      visibility: c.visibility ?? "public",
      tags: c.tags ?? [],
      created_at: "",
    };
  });
  return cache;
}

export function demoListCases(filter?: { spaceType?: string; keyword?: string }): CaseItem[] {
  let rows = toItems();
  if (filter?.spaceType) rows = rows.filter((c) => c.space_type === filter.spaceType);
  if (filter?.keyword) {
    const k = filter.keyword.toLowerCase();
    rows = rows.filter(
      (c) => c.title.toLowerCase().includes(k) || (c.raw_text ?? "").toLowerCase().includes(k),
    );
  }
  return [...rows].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.id - a.id);
}

export function demoGetCase(id: number): CaseItem | null {
  return toItems().find((c) => c.id === id) ?? null;
}

export function demoListSpaceTypes(): string[] {
  const counts = new Map<string, number>();
  for (const c of toItems()) counts.set(c.space_type, (counts.get(c.space_type) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function demoCaseCount(): number {
  return toItems().length;
}
