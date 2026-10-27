const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(46)} ${ok ? "✅" : "❌"} ${extra}`);
};
const clean = (s) => s.replace(/<!--.*?-->/g, "");

let r = await fetch(base + "/resources");
let html = clean(await r.text());
check("GET /resources 200", r.status === 200);
check("  显示 11 份资料", /11\s*份资料/.test(html));
check("  含吸顶灯资料", html.includes("2691新品订货会-吸顶灯"));
check("  含在售清单", html.includes("欧普家用智能照明在售清单"));
check("  分类：产品资料 / 在售清单", html.includes(">产品资料<") && html.includes(">在售清单<"));

r = await fetch(base + "/resources?c=" + encodeURIComponent("在售清单"));
html = clean(await r.text());
check("在售清单分类只 1 条", /1\s*份资料/.test(html) && html.includes("欧普家用智能照明在售清单") && !html.includes("吸顶灯"));

// 用真实 id 下载（id 是自增的，不一定是 1..11）
const list = (await (await fetch(base + "/api/resources")).json()).items;
console.log("  实际 id:", list.map((x) => x.id).join(","));
const samples = [list[0], list[Math.floor(list.length / 2)], list[list.length - 1]];
for (const item of samples) {
  const dl = await fetch(base + `/api/resources/${item.id}/download`);
  const buf = await dl.arrayBuffer();
  const isPdf = Buffer.from(buf.slice(0, 5)).toString() === "%PDF-";
  check(
    `下载 #${item.id} ${item.title.slice(0, 12)}`,
    dl.status === 200 && isPdf,
    `${(buf.byteLength / 1024 / 1024).toFixed(1)}MB ${item.size_kb}KB(声明)`,
  );
}

// 最大的那份（装饰灯 9.1MB）
const big = [...list].sort((a, b) => b.size_kb - a.size_kb)[0];
const dlBig = await fetch(base + `/api/resources/${big.id}/download`);
const bufBig = await dlBig.arrayBuffer();
check(`下载最大文件 ${big.title.slice(0, 14)}`, dlBig.status === 200 && bufBig.byteLength > 8 * 1024 * 1024, `${(bufBig.byteLength / 1024 / 1024).toFixed(1)}MB`);

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
