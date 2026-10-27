const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(44)} ${ok ? "✅" : "❌"} ${extra}`);
};
const clean = (s) => s.replace(/<!--.*?-->/g, "");

let r = await fetch(base + "/resources");
let html = clean(await r.text());
check("GET /resources 200", r.status === 200);
check("  空库提示", html.includes("还没有资料"));
check("  有上传入口", html.includes("/resources/upload"));
check("  分类改为产品向", html.includes(">产品资料<") && html.includes(">在售清单<"));
check("  已无报价单分类", !html.includes(">报价单<"));

// 上传一份"在售清单"样例，验证分类与下载，然后删掉
const xlsx = Buffer.from("UEsDBAoAAAAAA", "base64"); // 极小的 zip 头片段，只验证流程
const fd = new FormData();
fd.set("file", new Blob([xlsx], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "在售清单_2026样例.xlsx");
fd.set("title", "在售清单 · 2026 样例");
fd.set("category", "在售清单");
const up = await fetch(base + "/api/resources", { method: "POST", body: fd });
const j = await up.json();
check("上传在售清单 200", up.status === 200 && !!j.id, JSON.stringify(j));

r = await fetch(base + "/resources?c=" + encodeURIComponent("在售清单"));
html = clean(await r.text());
check("在售清单分类可见", html.includes("在售清单 · 2026 样例"));

const dl = await fetch(base + `/api/resources/${j.id}/download`);
check("下载 200", dl.status === 200);

await fetch(base + `/api/resources/${j.id}`, { method: "DELETE" });
r = await fetch(base + "/resources");
html = clean(await r.text());
check("删除后回到空库", html.includes("还没有资料"));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
