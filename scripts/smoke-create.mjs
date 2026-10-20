const base = "http://127.0.0.1:3100";

const testCase = {
  title: "【冒烟测试】某办公楼照明（可删除）",
  space_type: "办公",
  year: 2026,
  region: "测试城市",
  area_m2: 100,
  floor_height_m: 3.2,
  target_lux: 300,
  budget_range: "1-2 万",
  design_points: ["测试要点 A", "测试要点 B"],
  highlights: ["测试亮点"],
  reuse_points: ["测试可复用点"],
  raw_text: "冒烟测试用，稍后删除。",
  status: "待校对",
  visibility: "private",
  tags: ["测试"],
  fixtures: [
    { type: "LED筒灯", model: "T-9W", watt: 9, lumen: 800, cct: 4000, cri: 85, qty: 20, layout: "均布" },
    { type: "LED射灯", model: "T-12W", watt: 12, qty: 5 },
  ],
};

// 1) 正常创建
const res = await fetch(base + "/api/cases", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testCase),
});
const data = await res.json();
console.log(`POST /api/cases -> ${res.status}`, JSON.stringify(data), res.status === 201 ? "✅" : "❌");
const id = data.id;

// 2) 详情页能打开
if (id) {
  const page = await fetch(base + `/cases/${id}`);
  const html = await page.text();
  const ok = page.status === 200 && html.includes("测试要点 A") && html.includes("240");
  console.log(`GET /cases/${id} -> ${page.status} 含内容:${ok ? "✅" : "❌"}`);
}

// 3) 服务端算出的 total_w / lpd 是否正确（9*20 + 12*5 = 240W，100㎡ → LPD 2.4）
{
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync("D:/deepseek work/data/cases.db");
  const row = db.prepare("SELECT total_w, lpd FROM cases WHERE id = ?").get(id);
  const ok = row && Math.abs(row.total_w - 240) < 0.01 && Math.abs(row.lpd - 2.4) < 0.01;
  console.log(`服务端计算 total_w=${row?.total_w} lpd=${row?.lpd} -> ${ok ? "✅" : "❌"}`);
  db.prepare("DELETE FROM cases WHERE id = ?").run(id);
  console.log(`已清理测试数据 id=${id}`);
}

// 4) 非法参数要被拦住
for (const [label, body] of [
  ["空标题", { ...testCase, title: "" }],
  ["灯具为空", { ...testCase, fixtures: [] }],
  ["非法场所类型", { ...testCase, space_type: "不存在的类型" }],
  ["负数数量", { ...testCase, fixtures: [{ type: "x", watt: 10, qty: -1 }] }],
]) {
  const r = await fetch(base + "/api/cases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(`${label.padEnd(8)} -> ${r.status} ${r.status === 400 ? "✅ 已拦截" : "❌ 没拦住"}`);
}
