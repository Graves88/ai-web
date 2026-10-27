// 通用资料导入：把一个目录下的文件导入"资料中心"
// 用法：node scripts/import-resources.mjs "D:\path\to\dir" [--category=产品资料]
// 分类推断：文件名前缀含 产品/彩页 → 产品资料；清单/价格/单价 → 在售清单；
//           手册/安装 → 安装手册；规范/标准/GB → 规范标准；培训 → 培训资料；否则用 --category 或 其他
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const args = process.argv.slice(2);
const srcDir = args.find((a) => !a.startsWith("--"));
const forceCat = args.find((a) => a.startsWith("--category="))?.slice(11);
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error("用法：node scripts/import-resources.mjs \"<目录>\" [--category=产品资料]");
  process.exit(1);
}

const DATA = path.resolve(process.cwd(), "..", "data");
const RES_DIR = path.join(DATA, "resources");
const DB_PATH = path.join(DATA, "cases.db");
fs.mkdirSync(RES_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS resources (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT NOT NULL DEFAULT '其他',
    stored_name   TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime          TEXT,
    size_kb       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const MIME = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".zip": "application/zip",
};

function guessCategory(name) {
  if (forceCat) return forceCat;
  if (/产品|彩页|样本|目录|catalog/i.test(name)) return "产品资料";
  if (/清单|价格|单价|报价|price/i.test(name)) return "在售清单";
  if (/手册|安装|说明/i.test(name)) return "安装手册";
  if (/规范|标准|GB|国标/i.test(name)) return "规范标准";
  if (/培训|课件|教程/i.test(name)) return "培训资料";
  return "其他";
}

/** 标题清理：去掉"产品资料_/在售清单_"前缀、emoji、末尾 (1)，下划线换成空格 */
function cleanTitle(name) {
  let t = path.basename(name, path.extname(name));
  t = t.replace(/^(产品资料|在售清单|安装手册|规范标准|培训资料|其他)[_\s-]*/, "");
  t = t.replace(/[\uFE0F\u200D]/g, "");
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
  t = t.replace(/\s*\(\d+\)\s*$/, "");
  t = t.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return t || path.basename(name, path.extname(name));
}

function safeName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 60);
  return `${Date.now()}-${base}${ext}`;
}

const existing = new Set(db.prepare("SELECT original_name FROM resources").all().map((r) => r.original_name));
let added = 0;
for (const name of fs.readdirSync(srcDir)) {
  const abs = path.join(srcDir, name);
  if (!fs.statSync(abs).isFile()) continue;
  if (/\.(csv|md|txt)$/i.test(name)) continue;
  if (existing.has(name)) {
    console.log(`跳过（已存在）：${name}`);
    continue;
  }
  const ext = path.extname(name).toLowerCase();
  if (!MIME[ext]) {
    console.log(`跳过（不支持的类型）：${name}`);
    continue;
  }
  const category = guessCategory(name);
  const stored = safeName(name);
  fs.copyFileSync(abs, path.join(RES_DIR, stored));
  const title = cleanTitle(name);
  const desc =
    ext === ".pdf"
      ? `产品/业务资料（PDF，由原文件转换生成；原文件：${name}）`
      : `从 ${path.basename(srcDir)} 导入（原文件：${name}）`;
  db.prepare(
    "INSERT INTO resources (title, description, category, stored_name, original_name, mime, size_kb) VALUES (?,?,?,?,?,?,?)",
  ).run(
    title,
    desc,
    category,
    stored,
    name,
    MIME[ext],
    Math.round(fs.statSync(abs).size / 1024),
  );
  added++;
  console.log(`导入：${name}  [${category}]`);
}

const total = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(size_kb),0) kb FROM resources").get();
db.close();
console.log(`\n本次导入 ${added} 份；资料库现有 ${total.n} 份 / ${(total.kb / 1024).toFixed(1)} MB`);
