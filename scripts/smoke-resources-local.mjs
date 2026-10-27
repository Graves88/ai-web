const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(46)} ${ok ? "✅" : "❌"} ${extra}`);
};
// React SSR 会在文本节点间插入 <!-- -->，先去掉注释再断言
const clean = (s) => s.replace(/<!--.*?-->/g, "");

let r = await fetch(base + "/resources");
let html = clean(await r.text());
check("GET /resources 200", r.status === 200);
check("  显示资料数量 13", /13\s*份资料/.test(html), `${r.status}`);
check("  含真实资料标题", html.includes("君悦湾智能照明 — 报价单"));
check("  含分类行", html.includes(">报价单<") && html.includes(">方案<"));
check("  有上传按钮", html.includes("/resources/upload"));

// 分类筛选
r = await fetch(base + "/resources?c=" + encodeURIComponent("方案"));
html = clean(await r.text());
check("分类筛选 方案", r.status === 200 && html.includes("西派御江智能照明 — 方案") && !html.includes("— 报价单"));

// 下载
const dl = await fetch(base + "/api/resources/1/download");
const buf = await dl.arrayBuffer();
check(
  "下载接口 200",
  dl.status === 200 && buf.byteLength > 10000,
  `${decodeURIComponent(dl.headers.get("content-disposition") ?? "").slice(0, 46)} ${(buf.byteLength / 1024).toFixed(0)}KB`,
);

// 上传（1x1 PNG）
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const fd = new FormData();
fd.set("file", new Blob([png], { type: "image/png" }), "测试图片.png");
fd.set("title", "冒烟测试资料");
fd.set("category", "其他");
const up = await fetch(base + "/api/resources", { method: "POST", body: fd });
const upJson = await up.json();
check("上传接口 200", up.status === 200 && !!upJson.id, JSON.stringify(upJson));

r = await fetch(base + "/resources");
html = clean(await r.text());
check("上传后列表含新资料", html.includes("冒烟测试资料") && /14\s*份资料/.test(html));

// 删除
const del = await fetch(base + `/api/resources/${upJson.id}`, { method: "DELETE" });
check("删除接口 200", del.status === 200);
r = await fetch(base + "/resources");
html = clean(await r.text());
check("删除后列表恢复 13 份", /13\s*份资料/.test(html) && !html.includes("冒烟测试资料"));

// 非法类型
const fd2 = new FormData();
fd2.set("file", new Blob([Buffer.from("x")], { type: "text/plain" }), "bad.txt");
const bad = await fetch(base + "/api/resources", { method: "POST", body: fd2 });
check("非法类型被拒 415", bad.status === 415);

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
