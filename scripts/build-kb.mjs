// 构建知识库索引：把 data/extracted/*.json（按页切分的文本）写入 data/kb.db
// 用法：node scripts/build-kb.mjs
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA = path.resolve(process.cwd(), "..", "data");
const EXTRACTED = path.join(DATA, "extracted");
const DB_PATH = path.join(DATA, "kb.db");

const docs = fs
  .readdirSync(EXTRACTED)
  .filter((f) => f.endsWith(".json"))
  // 跳过重复的装饰灯（保留"最终版"）
  .filter((f) => !f.includes("❤️2691装饰灯新品介绍.json") && !f.includes("️2691装饰灯新品介绍.json"));

fs.rmSync(DB_PATH, { force: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE docs (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    type   TEXT NOT NULL,
    pages  INTEGER NOT NULL,
    chars  INTEGER NOT NULL
  );
  CREATE TABLE chunks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id  INTEGER NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
    page    INTEGER NOT NULL,
    title   TEXT,
    text    TEXT NOT NULL,
    chars   INTEGER NOT NULL
  );
  CREATE INDEX idx_chunks_doc ON chunks(doc_id);
`);

const insertDoc = db.prepare("INSERT INTO docs (source, type, pages, chars) VALUES (?,?,?,?)");
const insertChunk = db.prepare("INSERT INTO chunks (doc_id, page, title, text, chars) VALUES (?,?,?,?,?)");

let docCount = 0;
let chunkCount = 0;
for (const file of docs) {
  const data = JSON.parse(fs.readFileSync(path.join(EXTRACTED, file), "utf8"));
  const info = insertDoc.run(data.source, data.type, data.pages.length, data.totalChars);
  const docId = Number(info.lastInsertRowid);
  docCount++;
  for (const p of data.pages) {
    const text = (p.text ?? "").trim();
    if (!text) continue; // 纯图页跳过
    insertChunk.run(docId, p.page, p.slide_title ?? null, text, text.length);
    chunkCount++;
  }
  console.log(`${data.source}  ${data.pages.length} 页  ${data.totalChars} 字`);
}

const stat = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(chars),0) c FROM chunks").get();
db.close();
console.log(`\n知识库：${docCount} 份文档 / ${chunkCount} 个文本块 / ${(stat.c / 10000).toFixed(1)} 万字 -> ${DB_PATH}`);
