import { z } from "zod";
import { createCase } from "@/lib/cases";
import { SPACE_TYPES } from "@/lib/constants";

export const runtime = "nodejs";

// 服务端校验：前端校验只是体验，服务端才是防线
const fixtureSchema = z.object({
  type: z.string().min(1, "灯具类型不能为空").max(50),
  model: z.string().max(80).optional(),
  watt: z.number().min(0).max(10_000),
  lumen: z.number().min(0).max(200_000).optional(),
  cct: z.number().min(1000).max(20_000).optional(),
  cri: z.number().min(0).max(100).optional(),
  qty: z.number().int().min(1).max(100_000),
  layout: z.string().max(200).optional(),
});

const caseSchema = z.object({
  title: z.string().min(2, "标题至少 2 个字").max(120),
  space_type: z.enum(SPACE_TYPES),
  year: z.number().int().min(1990).max(2100).nullish(),
  region: z.string().max(40).nullish(),
  area_m2: z.number().min(0).max(10_000_000).nullish(),
  floor_height_m: z.number().min(0).max(200).nullish(),
  target_lux: z.number().min(0).max(100_000).nullish(),
  fixtures: z.array(fixtureSchema).min(1, "至少填一行灯具").max(200),
  budget_range: z.string().max(60).nullish(),
  design_points: z.array(z.string().max(300)).max(50).optional(),
  highlights: z.array(z.string().max(300)).max(50).optional(),
  reuse_points: z.array(z.string().max(300)).max(50).optional(),
  raw_text: z.string().max(20_000).nullish(),
  status: z.enum(["待校对", "已确认"]).optional(),
  visibility: z.enum(["private", "internal", "public"]).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
});

export async function POST(req: Request) {
  // 演示模式只读：线上公网 demo 不允许写
  if (process.env.DEMO_MODE === "1") {
    return Response.json({ error: "演示模式为只读，不能新增案例" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "参数校验失败", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }

  try {
    const id = createCase({
      ...parsed.data,
      // nullish 的字段统一成 null，避免 undefined 一路传下去
      year: parsed.data.year ?? null,
      region: parsed.data.region ?? null,
      area_m2: parsed.data.area_m2 ?? null,
      floor_height_m: parsed.data.floor_height_m ?? null,
      target_lux: parsed.data.target_lux ?? null,
      budget_range: parsed.data.budget_range ?? null,
      raw_text: parsed.data.raw_text ?? null,
    });
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/cases] insert failed", msg);
    return Response.json({ error: "写入数据库失败", detail: msg.slice(0, 200) }, { status: 500 });
  }
}
