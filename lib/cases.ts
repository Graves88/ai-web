import { getDb } from "./db";

export type Fixture = {
  type: string;
  model?: string;
  watt: number;
  lumen?: number;
  cct?: number;
  cri?: number;
  qty: number;
  layout?: string;
};

export type CaseRow = {
  id: number;
  title: string;
  space_type: string;
  year: number | null;
  region: string | null;
  area_m2: number | null;
  floor_height_m: number | null;
  target_lux: number | null;
  fixtures: string;
  total_w: number | null;
  lpd: number | null;
  budget_range: string | null;
  design_points: string | null;
  highlights: string | null;
  reuse_points: string | null;
  raw_text: string | null;
  status: string;
  visibility: string;
  tags: string | null;
  created_at: string;
};

export type CaseItem = Omit<CaseRow, "fixtures" | "design_points" | "highlights" | "reuse_points" | "tags"> & {
  fixtures: Fixture[];
  design_points: string[];
  highlights: string[];
  reuse_points: string[];
  tags: string[];
};

function parseJsonArray<T>(text: string | null, fallback: T[]): T[] {
  if (!text) return fallback;
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function toItem(row: CaseRow): CaseItem {
  return {
    ...row,
    fixtures: parseJsonArray<Fixture>(row.fixtures, []),
    design_points: parseJsonArray<string>(row.design_points, []),
    highlights: parseJsonArray<string>(row.highlights, []),
    reuse_points: parseJsonArray<string>(row.reuse_points, []),
    tags: parseJsonArray<string>(row.tags, []),
  };
}

/**
 * 计算字段：总功率与功率密度。
 * 注意——算数交给代码，绝不交给模型（P3 的核心原则）。
 */
export function calcTotals(fixtures: Fixture[], areaM2: number | null) {
  const totalW = fixtures.reduce((sum, f) => sum + (Number(f.watt) || 0) * (Number(f.qty) || 0), 0);
  const lpd = areaM2 && areaM2 > 0 ? totalW / areaM2 : null;
  return {
    total_w: Math.round(totalW * 10) / 10,
    lpd: lpd === null ? null : Math.round(lpd * 100) / 100,
  };
}

/** 场所类型白名单等常量放在 lib/constants.ts（客户端组件也要用，不能带 node:sqlite） */
export { SPACE_TYPES, type SpaceType } from "./constants";
import type { SpaceType } from "./constants";

export type CaseInput = {
  title: string;
  space_type: SpaceType;
  year?: number | null;
  region?: string | null;
  area_m2?: number | null;
  floor_height_m?: number | null;
  target_lux?: number | null;
  fixtures: Fixture[];
  budget_range?: string | null;
  design_points?: string[];
  highlights?: string[];
  reuse_points?: string[];
  raw_text?: string | null;
  status?: string;
  visibility?: string;
  tags?: string[];
};

/** 新建案例：计算字段在这里算好再入库（不信任前端传来的 total_w/lpd） */
export function createCase(input: CaseInput): number {
  const db = getDb();
  const { total_w, lpd } = calcTotals(input.fixtures, input.area_m2 ?? null);
  const info = db
    .prepare(
      `INSERT INTO cases (title, space_type, year, region, area_m2, floor_height_m, target_lux,
         fixtures, total_w, lpd, budget_range, design_points, highlights, reuse_points,
         raw_text, status, visibility, tags)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      input.title,
      input.space_type,
      input.year ?? null,
      input.region ?? null,
      input.area_m2 ?? null,
      input.floor_height_m ?? null,
      input.target_lux ?? null,
      JSON.stringify(input.fixtures ?? []),
      total_w,
      lpd,
      input.budget_range ?? null,
      JSON.stringify(input.design_points ?? []),
      JSON.stringify(input.highlights ?? []),
      JSON.stringify(input.reuse_points ?? []),
      input.raw_text ?? null,
      input.status ?? "待校对",
      input.visibility ?? "private",
      JSON.stringify(input.tags ?? []),
    );
  return Number(info.lastInsertRowid);
}

export function listCases(filter?: { spaceType?: string; keyword?: string }): CaseItem[] {
  const db = getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter?.spaceType) {
    where.push("space_type = ?");
    params.push(filter.spaceType);
  }
  if (filter?.keyword) {
    where.push("(title LIKE ? OR IFNULL(raw_text,'') LIKE ?)");
    params.push(`%${filter.keyword}%`, `%${filter.keyword}%`);
  }
  const sql =
    "SELECT * FROM cases" + (where.length ? " WHERE " + where.join(" AND ") : "") + " ORDER BY year DESC, id DESC";
  const rows = db.prepare(sql).all(...params) as unknown as CaseRow[];
  return rows.map(toItem);
}

export function getCase(id: number): CaseItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as unknown as CaseRow | undefined;
  return row ? toItem(row) : null;
}

export function listSpaceTypes(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT space_type, COUNT(*) AS n FROM cases GROUP BY space_type ORDER BY n DESC").all() as unknown as {
    space_type: string;
    n: number;
  }[];
  return rows.map((r) => r.space_type);
}
