// 种子数据导入：node scripts/seed.mjs [--reset]
// 把 seed/cases.json 里的脱敏示例案例写入 D:\deepseek work\data\cases.db
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd(); // 在 ai-web 目录下运行
const dataDir = process.env.DATA_DIR ?? path.join(root, "..", "data");
const dbPath = path.join(dataDir, "cases.db");
const seedPath = path.join(root, "seed", "cases.json");

fs.mkdirSync(dataDir, { recursive: true });

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const reset = process.argv.includes("--reset");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    space_type     TEXT NOT NULL,
    year           INTEGER,
    region         TEXT,
    area_m2        REAL,
    floor_height_m REAL,
    target_lux     INTEGER,
    fixtures       TEXT NOT NULL DEFAULT '[]',
    total_w        REAL,
    lpd            REAL,
    budget_range   TEXT,
    design_points  TEXT,
    highlights     TEXT,
    reuse_points   TEXT,
    raw_text       TEXT,
    status         TEXT NOT NULL DEFAULT '待校对',
    visibility     TEXT NOT NULL DEFAULT 'private',
    tags           TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS case_media (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id    INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    url        TEXT NOT NULL,
    cover_url  TEXT,
    title      TEXT,
    size_mb    REAL,
    duration_s INTEGER,
    sort       INTEGER NOT NULL DEFAULT 0
  );
`);

const existing = db.prepare("SELECT COUNT(*) AS n FROM cases").get().n;
if (existing > 0 && !reset) {
  console.log(`cases 表已有 ${existing} 条，跳过导入（要重灌请加 --reset）`);
  process.exit(0);
}
if (reset) {
  db.exec("DELETE FROM case_media; DELETE FROM cases;");
  console.log("已清空旧数据");
}

const insert = db.prepare(`
  INSERT INTO cases (title, space_type, year, region, area_m2, floor_height_m, target_lux,
    fixtures, total_w, lpd, budget_range, design_points, highlights, reuse_points,
    raw_text, status, visibility, tags)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

let inserted = 0;
for (const c of seed) {
  const fixtures = c.fixtures ?? [];
  // 计算字段交给代码，不交给模型
  const totalW = fixtures.reduce((s, f) => s + (Number(f.watt) || 0) * (Number(f.qty) || 0), 0);
  const lpd = c.area_m2 > 0 ? totalW / c.area_m2 : null;
  insert.run(
    c.title,
    c.space_type,
    c.year ?? null,
    c.region ?? null,
    c.area_m2 ?? null,
    c.floor_height_m ?? null,
    c.target_lux ?? null,
    JSON.stringify(fixtures),
    Math.round(totalW * 10) / 10,
    lpd === null ? null : Math.round(lpd * 100) / 100,
    c.budget_range ?? null,
    JSON.stringify(c.design_points ?? []),
    JSON.stringify(c.highlights ?? []),
    JSON.stringify(c.reuse_points ?? []),
    c.raw_text ?? null,
    c.status ?? "待校对",
    c.visibility ?? "private",
    JSON.stringify(c.tags ?? []),
  );
  inserted++;
}

console.log(`✅ 导入完成：${inserted} 条 -> ${dbPath}`);
const stat = db.prepare("SELECT space_type, COUNT(*) AS n, ROUND(SUM(total_w),1) AS w FROM cases GROUP BY space_type").all();
console.table(stat);
