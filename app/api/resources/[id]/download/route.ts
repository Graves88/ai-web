import fs from "node:fs";
import path from "node:path";
import { getResourceFile } from "@/lib/resources";

export const dynamic = "force-dynamic";

/** 下载资料：文件在 data/resources/ 下，永远不直接暴露为静态资源 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return new Response("无效的 id", { status: 400 });
  }

  const found = getResourceFile(numId);
  if (!found) {
    return new Response("资料不存在（或演示模式未开放）", { status: 404 });
  }

  const buf = fs.readFileSync(found.absPath);
  const filename = found.item.original_name;
  const ext = path.extname(filename).toLowerCase();
  const mime =
    found.item.mime ||
    (ext === ".pdf"
      ? "application/pdf"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".mp4"
            ? "video/mp4"
            : "application/octet-stream");

  return new Response(buf, {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
