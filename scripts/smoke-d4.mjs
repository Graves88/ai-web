const base = "http://127.0.0.1:3100";
const json = { "Content-Type": "application/json" };

const mk = (title, area, fixtures) => ({
  title,
  space_type: "办公",
  year: 2026,
  region: "测试城市",
  area_m2: area,
  budget_range: "1-2 万",
  design_points: ["要点"],
  highlights: [],
  reuse_points: [],
  raw_text: "冒烟测试，稍后删除",
  status: "待校对",
  visibility: "private",
  tags: ["测试"],
  fixtures,
});

// 1) 创建
let res = await fetch(base + "/api/cases", { method: "POST", headers: json, body: JSON.stringify(mk("【冒烟】编辑前标题", 100, [{ type: "LED筒灯", watt: 10, qty: 10 }])) });
const created = await res.json();
const id = created.id;
console.log(`创建 -> ${res.status} id=${id} ${res.status === 201 ? "✅" : "❌"}`);

// 2) 编辑（改标题/面积/灯具）
res = await fetch(`${base}/api/cases/${id}`, {
  method: "PUT",
  headers: json,
  body: JSON.stringify(mk("【冒烟】编辑后标题", 200, [{ type: "LED射灯", watt: 20, qty: 5 }])),
});
console.log(`PUT 编辑 -> ${res.status} ${res.status === 200 ? "✅" : "❌"}`);

// 3) 详情页反映修改 + 服务端重算（20*5=100W，200㎡ → LPD 0.5）
const page = await fetch(`${base}/cases/${id}`);
const html = await page.text();
const okDetail = page.status === 200 && html.includes("编辑后标题") && html.includes("100 W") && html.includes("0.5");
console.log(`详情页 -> ${page.status} 标题/重算结果正确: ${okDetail ? "✅" : "❌"}`);

// 4) 编辑接口校验
res = await fetch(`${base}/api/cases/${id}`, { method: "PUT", headers: json, body: JSON.stringify(mk("", 100, [{ type: "x", watt: 1, qty: 1 }])) });
console.log(`PUT 空标题 -> ${res.status} ${res.status === 400 ? "✅ 已拦截" : "❌"}`);

// 5) 筛选：场所=办公
let listRes = await fetch(base + "/cases?space=" + encodeURIComponent("办公"));
let listHtml = await listRes.text();
const noResidential = !listHtml.includes("某别墅全屋智能照明");
console.log(`筛选 场所=办公 -> ${listRes.status} 不含住宅案例: ${noResidential ? "✅" : "❌"}`);

// 6) 搜索关键词
listRes = await fetch(base + "/cases?q=" + encodeURIComponent("教室"));
listHtml = await listRes.text();
console.log(`搜索 q=教室 -> ${listRes.status} 命中: ${listHtml.includes("教室照明改造") ? "✅" : "❌"}`);

// 7) 删除
res = await fetch(`${base}/api/cases/${id}`, { method: "DELETE" });
console.log(`DELETE -> ${res.status} ${res.status === 200 ? "✅" : "❌"}`);
const after = await fetch(`${base}/cases/${id}`);
console.log(`删除后详情 -> ${after.status} ${after.status === 404 ? "✅" : "❌"}`);

// 8) 编辑页可打开（用现有案例 9）
// 注意：React SSR 会在动态文本间插入 <!-- --> 注释，不要用 "正在编辑 #9" 这种跨节点字符串做断言
const editPage = await fetch(base + "/cases/9/edit");
const editHtml = await editPage.text();
const okEdit = editPage.status === 200 && editHtml.includes("编辑案例") && editHtml.includes("保存修改");
console.log(`GET /cases/9/edit -> ${editPage.status} 编辑页可打开: ${okEdit ? "✅" : "❌"}`);
