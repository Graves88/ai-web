import { getDb } from "./db";
import { calcTotals, type Fixture } from "./calc";
import { demoGetCase, demoListCases, demoListSpaceTypes } from "./demo";

// 纯计算与 Fixture 类型放在 lib/calc.ts（客户端也可安全引用）
export { calcTotals, type Fixture } from "./calc";

/** 演示模式：只读 seed 数据，不碰 SQLite（公网上 Vercel 的文件系统是只读的） */
const isDemo = () => process.env.DEMO_MODE === "1";

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

export type CaseMedia = {
  id?: number;
  type: "image" | "video";
  url: string;
  poster?: string | null;
  title?: string | null;
};

export type CaseItem = Omit<CaseRow, "fixtures" | "design_points" | "highlights" | "reuse_points" | "tags"> & {
  fixtures: Fixture[];
  design_points: string[];
  highlights: string[];
  reuse_points: string[];
  tags: string[];
  /** 相册/视频；第一条图片自动作为封面 */
  media: CaseMedia[];
  cover: string | null;
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

function toItem(row: CaseRow, media: CaseMedia[] = []): CaseItem {
  return {
    ...row,
    fixtures: parseJsonArray<Fixture>(row.fixtures, []),
    design_points: parseJsonArray<string>(row.design_points, []),
    highlights: parseJsonArray<string>(row.highlights, []),
    reuse_points: parseJsonArray<string>(row.reuse_points, []),
    tags: parseJsonArray<string>(row.tags, []),
    media,
    cover: media.find((m) => m.type === "image")?.url ?? null,
  };
}

/** 把 case_media 表按 case_id 分组（真实模式用） */
function loadMediaByCase(): Map<number, CaseMedia[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, case_id, type, url, cover_url, title FROM case_media ORDER BY case_id, sort, id")
    .all() as unknown as { id: number; case_id: number; type: string; url: string; cover_url: string | null; title: string | null }[];
  const map = new Map<number, CaseMedia[]>();
  for (const r of rows) {
    const list = map.get(r.case_id) ?? [];
    list.push({
      id: r.id,
      type: r.type === "video" ? "video" : "image",
      url: r.url,
      poster: r.cover_url,
      title: r.title,
    });
    map.set(r.case_id, list);
  }
  return map;
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
  if (isDemo()) throw new Error("演示模式为只读，不能新建案例");
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
  if (isDemo()) return demoListCases(filter);
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
  const mediaByCase = loadMediaByCase();
  return rows.map((r) => toItem(r, mediaByCase.get(r.id) ?? []));
}

export function getCase(id: number): CaseItem | null {
  if (isDemo()) return demoGetCase(id);
  const db = getDb();
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as unknown as CaseRow | undefined;
  if (!row) return null;
  return toItem(row, loadMediaByCase().get(id) ?? []);
}

/** 更新案例：同样在服务端重算 total_w / lpd；返回是否命中记录 */
export function updateCase(id: number, input: CaseInput): boolean {
  if (isDemo()) throw new Error("演示模式为只读，不能修改案例");
  const db = getDb();
  const { total_w, lpd } = calcTotals(input.fixtures, input.area_m2 ?? null);
  const info = db
    .prepare(
      `UPDATE cases SET title=?, space_type=?, year=?, region=?, area_m2=?, floor_height_m=?,
         target_lux=?, fixtures=?, total_w=?, lpd=?, budget_range=?, design_points=?,
         highlights=?, reuse_points=?, raw_text=?, status=?, visibility=?, tags=?
       WHERE id=?`,
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
      id,
    );
  return Number(info.changes) > 0;
}

/** 删除案例（case_media 靠外键 CASCADE 一起删） */
export function deleteCase(id: number): boolean {
  if (isDemo()) throw new Error("演示模式为只读，不能删除案例");
  const db = getDb();
  const info = db.prepare("DELETE FROM cases WHERE id = ?").run(id);
  return Number(info.changes) > 0;
}

export function listSpaceTypes(): string[] {
  if (isDemo()) return demoListSpaceTypes();
  const db = getDb();
  const rows = db.prepare("SELECT space_type, COUNT(*) AS n FROM cases GROUP BY space_type ORDER BY n DESC").all() as unknown as {
    space_type: string;
    n: number;
  }[];
  return rows.map((r) => r.space_type);
}
