import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// 真实数据放在仓库外（D:\deepseek work\data），永远不会被 commit
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "..", "data");
const DB_PATH = path.join(DATA_DIR, "cases.db");

let db: DatabaseSync | null = null;

/** 单例：Next 开发模式下模块会被多次加载，用全局缓存避免重复打开数据库 */
const globalForDb = globalThis as unknown as { __casesDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (globalForDb.__casesDb) return globalForDb.__casesDb;
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new DatabaseSync(DB_PATH);
  conn.exec("PRAGMA journal_mode = WAL;");
  conn.exec("PRAGMA foreign_keys = ON;");
  conn.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      space_type    TEXT NOT NULL,
      year          INTEGER,
      region        TEXT,
      area_m2       REAL,
      floor_height_m REAL,
      target_lux    INTEGER,
      fixtures      TEXT NOT NULL DEFAULT '[]',
      total_w       REAL,
      lpd           REAL,
      budget_range  TEXT,
      design_points TEXT,
      highlights    TEXT,
      reuse_points  TEXT,
      raw_text      TEXT,
      status        TEXT NOT NULL DEFAULT '待校对',
      visibility    TEXT NOT NULL DEFAULT 'private',
      tags          TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
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

    CREATE INDEX IF NOT EXISTS idx_cases_space ON cases(space_type);
    CREATE INDEX IF NOT EXISTS idx_media_case ON case_media(case_id);
  `);

  db = conn;
  globalForDb.__casesDb = conn;
  return conn;
}

export const dbInfo = { DATA_DIR, DB_PATH };
