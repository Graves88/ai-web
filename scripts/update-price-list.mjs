// 用在售清单的"对外版（去机密声明）"替换资料库里的原件，并标记为可公开
// 用法：node scripts/update-price-list.mjs "<对外版 PDF 路径>"
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA = path.resolve(process.cwd(), "..", "data");
const RES_DIR = path.join(DATA, "resources");
const DB_PATH = path.join(DATA, "cases.db");
const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("用法：node scripts/update-price-list.mjs \"<对外版 PDF 路径>\"");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
for (const sql of [
  "ALTER TABLE resources ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal'",
  "ALTER TABLE resources ADD COLUMN public_url TEXT",
]) {
  try {
    db.exec(sql);
  } catch {}
}

const row = db.prepare("SELECT * FROM resources WHERE title LIKE '在售清单%' OR category='在售清单'").get();
if (!row) {
  console.error("资料库里没有在售清单记录");
  process.exit(1);
}

const storedName = `public-${Date.now()}-price-list.pdf`;
fs.mkdirSync(RES_DIR, { recursive: true });
fs.copyFileSync(src, path.join(RES_DIR, storedName));
const oldPath = path.join(RES_DIR, row.stored_name);
if (fs.existsSync(oldPath) && oldPath !== path.join(RES_DIR, storedName)) fs.rmSync(oldPath, { force: true });

const sizeKB = Math.round(fs.statSync(src).size / 1024);
db.prepare(
  "UPDATE resources SET stored_name=?, original_name=?, description=?, size_kb=? WHERE id=?",
).run(
  storedName,
  "在售清单_欧普家用智能照明在售清单-26年10月-对外版.pdf",
  "对外版：产品参数清单（不含价格）；价格与政策请联系对接销售。",
  sizeKB,
  row.id,
);
db.close();
console.log(`已替换在售清单（id=${row.id}）为对外版：${sizeKB} KB`);
