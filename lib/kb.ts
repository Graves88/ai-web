import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * 知识库检索（P2 RAG 的第一层：关键词召回）
 * - 数据来自 data/kb.db（由 scripts/build-kb.mjs 从 data/extracted 生成，仓库外）
 * - 中文用 LIKE 做子串匹配；排序 = 标题命中 > 正文命中次数 > 页码靠前
 * - 之后接入 embedding 重排时，召回这层保持不变
 */
const isDemo = () => process.env.DEMO_MODE === "1";

export type KbHit = {
  docId: number;
  source: string;
  type: string;
  page: number;
  title: string | null;
  snippet: string;
  score: number;
  // 若该文档已公开发布，给出 PDF 直链（带 #page=）
  pdfUrl?: string;
};

let cachedDb: DatabaseSync | null = null;

function db(): DatabaseSync | null {
  if (isDemo()) return null;
  if (cachedDb) return cachedDb;
  const dbPath = path.join(process.cwd(), "..", "data", "kb.db");
  if (!fs.existsSync(dbPath)) return null;
  cachedDb = new DatabaseSync(dbPath, { readOnly: true });
  return cachedDb;
}

type PublicResource = { title: string; url: string; category: string };

function publicMap(): Map<string, string> {
  try {
    const list = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "seed", "resources-public.json"), "utf8"),
    ) as PublicResource[];
    const map = new Map<string, string>();
    for (const r of list) {
      // 公开资料的标题与知识库 source 做模糊对应：去掉前缀/扩展名后比较
      map.set(r.title, r.url);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** 把知识库 source 文件名映射到公网 PDF 链接（匹配不到就不给链接） */
function matchPublicUrl(source: string, map: Map<string, string>): string | undefined {
  const base = path.basename(source, path.extname(source));
  const normalized = base.replace(/^(产品资料|在售清单)[_\s-]*/, "").replace(/[\uFE0F\u200D]/g, "").trim();
  for (const [title, url] of map) {
    const t = title.replace(/[\uFE0F\u200D]/g, "").trim();
    if (t === normalized || t.includes(normalized) || normalized.includes(t)) return url;
  }
  return undefined;
}

function makeSnippet(text: string, keyword: string, width = 120): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return text.slice(0, width);
  const start = Math.max(0, idx - Math.floor(width / 3));
  const end = Math.min(text.length, start + width);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

export function searchKb(query: string, limit = 8): KbHit[] {
  const q = query.trim();
  if (!q) return [];
  const conn = db();
  if (!conn) return [];

  const rows = conn
    .prepare(
      `SELECT c.id, c.doc_id, c.page, c.title, c.text, d.source, d.type
       FROM chunks c JOIN docs d ON d.id = c.doc_id
       WHERE c.text LIKE ? OR IFNULL(c.title,'') LIKE ?`,
    )
    .all(`%${q}%`, `%${q}%`) as unknown as {
    id: number;
    doc_id: number;
    page: number;
    title: string | null;
    text: string;
    source: string;
    type: string;
  }[];

  const lower = q.toLowerCase();
  const hits: KbHit[] = rows.map((r) => {
    const titleHit = (r.title ?? "").toLowerCase().includes(lower) ? 3 : 0;
    const occurrences = (r.text.toLowerCase().match(new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
      .length;
    return {
      docId: r.doc_id,
      source: r.source,
      type: r.type,
      page: r.page,
      title: r.title,
      snippet: makeSnippet(r.text, q),
      score: titleHit + occurrences,
    };
  });

  const map = publicMap();
  return hits
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, limit)
    .map((h) => ({ ...h, pdfUrl: matchPublicUrl(h.source, map) }));
}

export function kbStats(): { docs: number; chunks: number; chars: number } {
  const conn = db();
  if (!conn) return { docs: 0, chunks: 0, chars: 0 };
  const d = conn.prepare("SELECT COUNT(*) n FROM docs").get() as unknown as { n: number };
  const c = conn.prepare("SELECT COUNT(*) n, COALESCE(SUM(chars),0) s FROM chunks").get() as unknown as {
    n: number;
    s: number;
  };
  return { docs: d.n, chunks: c.n, chars: c.s };
}
