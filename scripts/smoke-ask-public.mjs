const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(46)} ${ok ? "✅" : "❌"} ${extra}`);
};
const clean = (s) => s.replace(/<!--.*?-->/g, "");
const mode = process.argv[2] ?? "local";
const expectDocs = mode === "demo" ? 11 : 11;

// 1) 页面
let r = await fetch(base + "/ask");
let html = clean(await r.text());
check(`${mode}: GET /ask 200`, r.status === 200);
check("  有搜索框", html.includes('name="q"'));
check(`  显示 ${expectDocs} 份文档`, new RegExp(`${expectDocs}\\s*份文档`).test(html));

// 2) 搜产品名
r = await fetch(base + "/ask?q=" + encodeURIComponent("晾衣机"));
html = clean(await r.text());
check("搜「晾衣机」命中", html.includes("命中") && html.includes("零售渠道"));
check("  带页码 + 看原文", /第\s*\d+\s*页/.test(html) && html.includes("#page="));

// 3) 搜物料代码
r = await fetch(base + "/ask?q=520037020800");
html = clean(await r.text());
check("搜物料代码 520037020800", html.includes("在售清单"));

// 4) 搜系列
r = await fetch(base + "/ask?q=" + encodeURIComponent("天境Lite"));
html = clean(await r.text());
check("搜「天境Lite」", html.includes("天境"));

// 5) 空结果
r = await fetch(base + "/ask?q=zzzznotexist");
html = clean(await r.text());
check("空结果提示", html.includes("没搜到"));

// 6) 公网模式不得出现机密字样
if (mode === "demo") {
  r = await fetch(base + "/ask?q=" + encodeURIComponent("价格体系"));
  html = clean(await r.text());
  check("演示模式搜不到机密声明", !html.includes("公司机密") && !html.includes("禁止传递"));
}

// 7) 对外版清单已上线
const price = await fetch(base + "/resources/01-price.pdf");
check("对外版在售清单可下载", price.status === 200, String(price.status));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
