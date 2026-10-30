import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * 知识库检索（P2 RAG 第一层：关键词召回）
 * - 本地：读 data/kb.db（scripts/build-kb.mjs 生成，仓库外，含全部资料）
 * - 公网演示：读 seed/kb-public.json（scripts/export-kb-public.mjs 导出，已过滤敏感段）
 * - 中文处理：把问句切成 2-4 字 n-gram 关键词，按"命中词长²之和"打分，不依赖分词库
 */
const isDemo = () => process.env.DEMO_MODE === "1";

export type KbHit = {
  docId: number;
  source: string;
  type: string;
  page: number;
  title: string | null;
  snippet: string;
  context: string;
  score: number;
  pdfUrl?: string;
};

type RawChunk = { docId: number; page: number; title: string | null; text: string; source: string; type: string };

const STOP = /[的了吗呢吧啊呀有有哪些什么怎么多少请问一下帮我查看看能不能是否还?？,，。！!、；;：:\s]/g;

/** 把问句切成关键词（2-4 字 n-gram，去掉口语停用字） */
/** 型号/数字类 token（T02、Ra97、LYJXW、520037020800、60000）——精确匹配价值最高 */
function extractExactTokens(q: string): string[] {
  const tokens = new Set<string>();
  for (const m of q.matchAll(/[A-Za-z]{1,4}\d+[\w.-]*|\d{4,}/g)) tokens.add(m[0].toLowerCase());
  for (const m of q.matchAll(/Ra\s*(\d+)/gi)) {
    tokens.add(m[0].toLowerCase().replace(/\s+/g, "")); // ra97
    tokens.add(m[1]); // 97（表格里常只写数字）
  }
  return [...tokens];
}

/** 口语问法 → 资料里的书面词（问"多薄"，资料里写的是"超薄/厚度"） */
const SYNONYMS: [string, string[]][] = [
  ["显色指数", ["显指", "ra"]],
  ["多薄", ["超薄", "厚度"]],
  ["多宽", ["宽度", "尺寸"]],
  ["多亮", ["亮度", "流明", "光通量"]],
  ["几瓦", ["功率", "w"]],
  ["多大功率", ["功率"]],
  ["多少钱", ["价格", "单价"]],
  ["保修", ["质保"]],
  ["待上市", ["新品待上市"]],
];

function buildKeywords(q: string): string[] {
  const cleaned = q.replace(STOP, " ").trim();
  const segments = cleaned.split(/\s+/).filter((s) => s.length >= 2);
  const set = new Set<string>();
  for (const seg of segments) {
    const maxN = Math.min(4, seg.length);
    for (let n = 2; n <= maxN; n++) {
      for (let i = 0; i + n <= seg.length; i++) set.add(seg.slice(i, i + n));
    }
    if (seg.length <= 4) set.add(seg);
  }
  // 同义词扩展：问法里的口语词 → 资料里的书面词
  for (const [ask, extra] of SYNONYMS) {
    if (q.includes(ask)) for (const e of extra) set.add(e);
  }
  return [...set];
}

/**
 * 打分规则（v2，固定下来的排序逻辑）
 * - 普通关键词：命中 → +词长²
 * - 标题命中：+词长²×2（标题往往是"这一段讲什么"的最强信号）
 * - 型号/数字 token：+词长²×3（精确串，命中基本就锁定相关页）
 * - 整句命中：+30
 */
function scoreText(
  title: string | null,
  text: string,
  keywords: string[],
  exactTokens: string[],
  wholeQuery: string,
): { score: number; matched: number } {
  const lowerTitle = (title ?? "").toLowerCase();
  const lowerText = text.toLowerCase();
  let score = 0;
  let matched = 0;

  for (const k of keywords) {
    const w = k.length * k.length;
    if (lowerTitle.includes(k)) {
      matched++;
      score += w * 2;
    } else if (lowerText.includes(k)) {
      matched++;
      score += w;
    }
  }
  for (const t of exactTokens) {
    if (lowerText.includes(t)) {
      matched++;
      score += t.length * t.length * 3;
    }
  }
  if (lowerText.includes(wholeQuery.toLowerCase()) || lowerTitle.includes(wholeQuery.toLowerCase())) {
    score += 30;
  }
  return { score, matched };
}

export type PublicKb = {
  generatedAt: string;
  docs: { id: number; source: string; type: string; pages: number; chars: number }[];
  chunks: { docId: number; page: number; title: string; text: string }[];
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
    cachedPublic = JSON.parse(fs.readFileSync(path.join(process.cwd(), "seed", "kb-public.json"), "utf8")) as PublicKb;
    return cachedPublic;
  } catch {
    return null;
  }
}

function allChunks(): RawChunk[] {
  if (isDemo()) {
    const kb = publicKb();
    if (!kb) return [];
    const docById = new Map(kb.docs.map((d) => [d.id, d]));
    return kb.chunks.map((c) => {
      const doc = docById.get(c.docId);
      return {
        docId: c.docId,
        page: c.page,
        title: c.title || null,
        text: c.text,
        source: doc?.source ?? "",
        type: doc?.type ?? "",
      };
    });
  }
  const conn = db();
  if (!conn) return [];
  const rows = conn
    .prepare(
      `SELECT c.doc_id AS docId, c.page, c.title, c.text, d.source, d.type
       FROM chunks c JOIN docs d ON d.id = c.doc_id`,
    )
    .all() as unknown as RawChunk[];
  return rows;
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

export function searchKb(query: string, limit = 8): KbHit[] {
  const q = query.trim();
  if (!q) return [];

  const keywords = buildKeywords(q);
  const exactTokens = extractExactTokens(q);
  const map = publicMap();
  const rows = allChunks();

  const scored = rows
    .map((r) => {
      const { score, matched } = scoreText(r.title, r.text, keywords, exactTokens, q);
      return { r, score, matched };
    })
    // 至少命中 1 个关键词（含整句/型号命中）
    .filter((x) => x.matched > 0)
    .sort((a, b) => b.score - a.score || a.r.page - b.r.page);

  // 来源多样性：普通文档最多 3 块；表格逐行块（1340 个产品行）最多 2 块，
  // 避免行块把 PPT 卖点页挤掉（T02 厚度就靠电工第 18 页）。
  const picked: typeof scored = [];
  const used = new Map<string, number>();
  for (const x of scored) {
    if (picked.length >= limit) break;
    const key = x.r.source;
    const isRowChunk = key.includes("逐行切分");
    const cap = isRowChunk ? 2 : 3;
    const n = used.get(key) ?? 0;
    if (n >= cap) continue;
    used.set(key, n + 1);
    picked.push(x);
  }
  // 不够 limit 时再按分数补满（放开限制）
  if (picked.length < limit) {
    for (const x of scored) {
      if (picked.length >= limit) break;
      if (!picked.includes(x)) picked.push(x);
    }
  }
  picked.sort((a, b) => b.score - a.score);
  picked.sort((a, b) => b.score - a.score);

  return picked.map(({ r, score }) => ({
    docId: r.docId,
    source: r.source,
    type: r.type,
    page: r.page,
    title: r.title,
    snippet: makeSnippet(r.text, keywords[0] ?? q),
    context: r.text.slice(0, 1200),
    score,
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
