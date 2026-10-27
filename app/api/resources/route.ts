import { NextResponse } from "next/server";
import { createResource, listResources } from "@/lib/resources";
import { ALLOWED_EXT, MAX_UPLOAD_MB, RESOURCE_CATEGORIES } from "@/lib/constants";
import path from "node:path";

const isDemo = () => process.env.DEMO_MODE === "1";

export async function GET() {
  return NextResponse.json({ items: listResources() });
}

export async function POST(req: Request) {
  if (isDemo()) {
    return NextResponse.json({ error: "演示模式为只读，不能上传资料" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "请用 multipart/form-data 上传" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "文件是空的" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return NextResponse.json({ error: `文件超过 ${MAX_UPLOAD_MB}MB` }, { status: 413 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: `不支持的文件类型：${ext}` }, { status: 415 });
  }

  const title = String(form.get("title") ?? "").trim() || path.basename(file.name, ext);
  const description = String(form.get("description") ?? "").trim() || null;
  const rawCategory = String(form.get("category") ?? "").trim();
  const category = (RESOURCE_CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : "其他";

  try {
    const id = createResource({
      title,
      description,
      category,
      originalName: file.name,
      mime: file.type || null,
      buffer: await file.arrayBuffer(),
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存失败" }, { status: 500 });
  }
}
