// 导出"公网版知识库索引"到 seed/kb-public.json（随代码上线，演示站可检索）
// - 去掉含"机密/禁止传递/价格体系"的段落
// - 每块截断到 2000 字，控制体积
// 用法：node scripts/export-kb-public.mjs
import fs from "node:fs";
import path from "node:path";

const DATA = path.resolve(process.cwd(), "..", "data");
const EXTRACTED = path.join(DATA, "extracted");
const OUT = path.join(process.cwd(), "seed", "kb-public.json");

const BLOCKLIST = ["机密", "禁止传递", "价格体系"];
const MAX_CHARS = 2000;

const docs = [];
const chunks = [];
let docId = 0;
let skippedParas = 0;

for (const file of fs.readdirSync(EXTRACTED).filter((f) => f.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(EXTRACTED, file), "utf8"));
  docId++;
  let kept = 0;
  for (const p of data.pages) {
    const paragraphs = (p.text ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => {
        const bad = BLOCKLIST.some((k) => s.includes(k));
        if (bad) skippedParas++;
        return !bad;
      });
    const text = paragraphs.join("\n").slice(0, MAX_CHARS);
    if (!text) continue;
    chunks.push({ docId, page: p.page, title: p.slide_title ?? "", text });
    kept++;
  }
  docs.push({ id: docId, source: data.source.replace(/[\uFE0F\u200D]/g, ""), type: data.type, pages: data.pages.length, chars: kept ? data.totalChars : 0 });
}

fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), docs, chunks }, null, 0) + "\n", "utf8");
const sizeKB = Math.round(fs.statSync(OUT).size / 1024);
console.log(`导出 ${docs.length} 份文档 / ${chunks.length} 个文本块 / ${sizeKB} KB -> ${OUT}`);
console.log(`过滤掉 ${skippedParas} 段含敏感词的内容`);
