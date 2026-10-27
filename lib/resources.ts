import fs from "node:fs";
import path from "node:path";
import { dbInfo, getDb } from "./db";

/**
 * 资料中心（内部资料库）
 * - 文件保存在仓库外的 data/resources/，实体文件永远不进 git、不上公网
 * - 元数据存在 SQLite 的 resources 表
 * - DEMO_MODE（公网演示）下：列表为空，上传/删除一律拒绝
 */
const isDemo = () => process.env.DEMO_MODE === "1";

export type ResourceItem = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  original_name: string;
  mime: string | null;
  size_kb: number;
  created_at: string;
};

export type ResourceWithFile = ResourceItem & { stored_name: string };

export function listResources(category?: string): ResourceItem[] {
  if (isDemo()) return [];
  const db = getDb();
  const rows = category
    ? db.prepare("SELECT * FROM resources WHERE category = ? ORDER BY id DESC").all(category)
    : db.prepare("SELECT * FROM resources ORDER BY id DESC").all();
  return rows as unknown as ResourceItem[];
}

export function getResource(id: number): ResourceWithFile | null {
  if (isDemo()) return null;
  const row = getDb().prepare("SELECT * FROM resources WHERE id = ?").get(id) as unknown as
    | ResourceWithFile
    | undefined;
  return row ?? null;
}

function safeFileName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const base = path
    .basename(name, path.extname(name))
    .replace(/[\\/:*?"<>|\s]+/g, "_")
    .slice(0, 60);
  return `${Date.now()}-${base || "file"}${ext}`;
}

export function createResource(input: {
  title: string;
  description?: string | null;
  category?: string;
  originalName: string;
  mime?: string | null;
  buffer: ArrayBuffer;
}): number {
  if (isDemo()) throw new Error("演示模式为只读，不能上传资料");
  fs.mkdirSync(dbInfo.RES_DIR, { recursive: true });
  const storedName = safeFileName(input.originalName);
  fs.writeFileSync(path.join(dbInfo.RES_DIR, storedName), Buffer.from(input.buffer));
  const info = getDb()
    .prepare(
      "INSERT INTO resources (title, description, category, stored_name, original_name, mime, size_kb) VALUES (?,?,?,?,?,?,?)",
    )
    .run(
      input.title,
      input.description ?? null,
      input.category || "其他",
      storedName,
      input.originalName,
      input.mime ?? null,
      Math.round(input.buffer.byteLength / 1024),
    );
  return Number(info.lastInsertRowid);
}

/** 物理文件路径（下载 / 后续解析入库用） */
export function getResourceFile(id: number): { absPath: string; item: ResourceWithFile } | null {
  const item = getResource(id);
  if (!item) return null;
  const absPath = path.join(dbInfo.RES_DIR, item.stored_name);
  if (!fs.existsSync(absPath)) return null;
  return { absPath, item };
}

export function deleteResource(id: number): boolean {
  if (isDemo()) throw new Error("演示模式为只读，不能删除资料");
  const item = getResource(id);
  if (!item) return false;
  const abs = path.join(dbInfo.RES_DIR, item.stored_name);
  if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  const info = getDb().prepare("DELETE FROM resources WHERE id = ?").run(id);
  return Number(info.changes) > 0;
}
