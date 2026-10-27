// 把资料库里"可公开"的资料发布到 public/resources/，供公网演示站下载
// - 复制文件到 public/resources/（进 git，Vercel 静态托管）
// - 写入 seed/resources-public.json（演示模式下列表数据源）
// - 更新本地库的 visibility / public_url
// 用法：node scripts/publish-resources.mjs --exclude=在售清单
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA = path.resolve(process.cwd(), "..", "data");
const DB_PATH = path.join(DATA, "cases.db");
const SRC_DIR = path.join(DATA, "resources");
const OUT_DIR = path.join(process.cwd(), "public", "resources");

const excludeArg = process.argv.find((a) => a.startsWith("--exclude="));
const excludeKeywords = (excludeArg ? excludeArg.slice(10) : "在售清单").split(",").filter(Boolean);

fs.mkdirSync(OUT_DIR, { recursive: true });
// 清空旧的已发布 PDF，避免改编号后留下孤儿文件
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith(".pdf")) fs.rmSync(path.join(OUT_DIR, f), { force: true });
}

const db = new DatabaseSync(DB_PATH);
// 迁移：老库补 visibility / public_url 列
for (const sql of [
  "ALTER TABLE resources ADD COLUMN visibility TEXT NOT NULL DEFAULT 'internal'",
  "ALTER TABLE resources ADD COLUMN public_url TEXT",
]) {
  try {
    db.exec(sql);
  } catch {
    /* 已存在 */
  }
}
const rows = db.prepare("SELECT * FROM resources ORDER BY category DESC, id DESC").all();

const published = [];
let seq = 0;
for (const r of rows) {
  const isExcluded = excludeKeywords.some((k) => r.title.includes(k) || r.category.includes(k));
  if (isExcluded) {
    db.prepare("UPDATE resources SET visibility='internal', public_url=NULL WHERE id=?").run(r.id);
    console.log(`内部（不公开）：${r.title}`);
    continue;
  }
  const src = path.join(SRC_DIR, r.stored_name);
  if (!fs.existsSync(src)) {
    console.log(`跳过（文件缺失）：${r.title}`);
    continue;
  }
  seq++;
  // 静态文件名用 ASCII，避免中文 URL 编码问题
  const fileName = `${String(seq).padStart(2, "0")}-${r.category === "在售清单" ? "price" : "product"}.pdf`;
  const url = `/resources/${fileName}`;
  fs.copyFileSync(src, path.join(OUT_DIR, fileName));
  const updatedAt = (r.created_at ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  published.push({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    category: r.category,
    url,
    sizeKB: r.size_kb,
    updatedAt,
    tags: [r.category],
  });
  db.prepare("UPDATE resources SET visibility='public', public_url=? WHERE id=?").run(url, r.id);
  console.log(`公开：${r.title}  ->  ${url}  ${(r.size_kb / 1024).toFixed(1)}MB`);
}
db.close();

fs.mkdirSync(path.join(process.cwd(), "seed"), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), "seed", "resources-public.json"),
  JSON.stringify(published, null, 2) + "\n",
  "utf8",
);

const totalMB = published.reduce((s, x) => s + x.sizeKB, 0) / 1024;
console.log(`\n已发布 ${published.length} 份，共 ${totalMB.toFixed(1)}MB → public/resources/ + seed/resources-public.json`);
