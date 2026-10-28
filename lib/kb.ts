import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * 知识库检索（P2 RAG 的第一层：关键词召回）
 * - 本地：读 data/kb.db（scripts/build-kb.mjs 生成，仓库外，含全部资料）
 * - 公网演示：读 seed/kb-public.json（scripts/export-kb-public.mjs 导出，已过滤敏感段）
 * - 中文用子串匹配；排序 = 标题命中 > 正文命中次数 > 页码靠前
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
  pdfUrl?: string;
};

type DbChunk = { doc_id: number; page: number; title: string | null; text: string; source: string; type: string };
type PublicChunk = { docId: number; page: number; title: string; text: string };
type PublicKb = {
  generatedAt: string;
  docs: { id: number; source: string; type: string; pages: number; chars: number }[];
  chunks: PublicChunk[];
};

let cachedDb: DatabaseSync | null = null;
let cachedPublic: PublicKb | null = null;

function db(): DatabaseSync | null {
  if (isDemo()) return null;
  if (cachedDb) return cachedDb;
  const dbPath = path.join(process.cwd(), "..", "data", "kb.db");
  if (!fs.existsSync(dbPath)) return null;
  cachedDb = new DatabaseSync(dbPath, { readOnly: true });
  return cachedDb;
}

function publicKb(): PublicKb | null {
  if (cachedPublic) return cachedPublic;
  try {
    const file = path.join(process.cwd(), "seed", "kb-public.json");
    cachedPublic = JSON.parse(fs.readFileSync(file, "utf8")) as PublicKb;
    return cachedPublic;
  } catch {
    return null;
  }
}

type PublicResource = { title: string; url: string; category: string };

function publicMap(): Map<string, string> {
  try {
    const list = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "seed", "resources-public.json"), "utf8"),
    ) as PublicResource[];
    return new Map(list.map((r) => [r.title, r.url]));
  } catch {
    return new Map();
  }
}

function normalize(s: string): string {
  return path
    .basename(s, path.extname(s))
    .replace(/^(产品资料|在售清单)[_\s-]*/, "")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
}

/** 知识库 source ↔ 公开 PDF 链接（能对上就允许"看原文"跳页） */
function matchPublicUrl(source: string, map: Map<string, string>): string | undefined {
  const n = normalize(source);
  for (const [title, url] of map) {
    const t = normalize(title);
    if (t === n || t.includes(n) || n.includes(t)) return url;
  }
  return undefined;
}

function makeSnippet(text: string, keyword: string, width = 140): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return text.slice(0, width).replace(/\s+/g, " ");
  const start = Math.max(0, idx - Math.floor(width / 3));
  const end = Math.min(text.length, start + width);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}

function rank<T extends { title: string | null; text: string; page: number }>(rows: T[], q: string): (T & { score: number })[] {
  const lower = q.toLowerCase();
  const esc = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "g");
  return rows.map((r) => {
    const titleHit = (r.title ?? "").toLowerCase().includes(lower) ? 3 : 0;
    const occurrences = (r.text.toLowerCase().match(re) ?? []).length;
    return { ...r, score: titleHit + occurrences };
  });
}

export function searchKb(query: string, limit = 8): KbHit[] {
  const q = query.trim();
  if (!q) return [];
  const map = publicMap();

  if (isDemo()) {
    const kb = publicKb();
    if (!kb) return [];
    const lower = q.toLowerCase();
    const matched = kb.chunks.filter((c) => c.text.toLowerCase().includes(lower) || c.title.toLowerCase().includes(lower));
    const docById = new Map(kb.docs.map((d) => [d.id, d]));
    const ranked = rank(matched, q).sort((a, b) => b.score - a.score || a.page - b.page).slice(0, limit);
    return ranked.map((c) => {
      const doc = docById.get(c.docId);
      const source = doc?.source ?? "";
      return {
        docId: c.docId,
        source,
        type: doc?.type ?? "",
        page: c.page,
        title: c.title || null,
        snippet: makeSnippet(c.text, q),
        score: c.score,
        pdfUrl: matchPublicUrl(source, map),
      };
    });
  }

  const conn = db();
  if (!conn) return [];
  const rows = conn
    .prepare(
      `SELECT c.doc_id, c.page, c.title, c.text, d.source, d.type
       FROM chunks c JOIN docs d ON d.id = c.doc_id
       WHERE c.text LIKE ? OR IFNULL(c.title,'') LIKE ?`,
    )
    .all(`%${q}%`, `%${q}%`) as unknown as DbChunk[];

  return rank(rows, q)
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, limit)
    .map((r) => ({
      docId: r.doc_id,
      source: r.source,
      type: r.type,
      page: r.page,
      title: r.title,
      snippet: makeSnippet(r.text, q),
      score: r.score,
      pdfUrl: matchPublicUrl(r.source, map),
    }));
}

export function kbStats(): { docs: number; chunks: number; chars: number; demo: boolean } {
  if (isDemo()) {
    const kb = publicKb();
    if (!kb) return { docs: 0, chunks: 0, chars: 0, demo: true };
    const chars = kb.chunks.reduce((s, c) => s + c.text.length, 0);
    return { docs: kb.docs.length, chunks: kb.chunks.length, chars, demo: true };
  }
  const conn = db();
  if (!conn) return { docs: 0, chunks: 0, chars: 0, demo: false };
  const d = conn.prepare("SELECT COUNT(*) n FROM docs").get() as unknown as { n: number };
  const c = conn.prepare("SELECT COUNT(*) n, COALESCE(SUM(chars),0) s FROM chunks").get() as unknown as {
    n: number;
    s: number;
  };
  return { docs: d.n, chunks: c.n, chars: c.s, demo: false };
}
