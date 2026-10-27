import { NextResponse } from "next/server";
import { deleteResource } from "@/lib/resources";

const isDemo = () => process.env.DEMO_MODE === "1";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isDemo()) {
    return NextResponse.json({ error: "演示模式为只读" }, { status: 403 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "无效的 id" }, { status: 400 });
  }
  try {
    const ok = deleteResource(numId);
    if (!ok) return NextResponse.json({ error: "资料不存在" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "删除失败" }, { status: 500 });
  }
}
