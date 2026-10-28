const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(44)} ${ok ? "✅" : "❌"} ${extra}`);
};
const clean = (s) => s.replace(/<!--.*?-->/g, "");
const mode = process.argv[2] ?? "local";

if (mode === "demo") {
  const r = await fetch(base + "/ask");
  const html = clean(await r.text());
  check("演示 /ask 200", r.status === 200);
  check("  显示内部资料提示", html.includes("知识库为内部资料"));
  check("  不泄露文档名", !html.includes("晾衣机") && !html.includes("在售清单"));
} else {
  // 1) 首页
  let r = await fetch(base + "/ask");
  let html = clean(await r.text());
  check("GET /ask 200", r.status === 200);
  check("  显示知识库规模", /11\s*份文档/.test(html) && /213\s*个文本块/.test(html));
  check("  有搜索框", html.includes('name="q"'));

  // 2) 搜产品名
  r = await fetch(base + "/ask?q=" + encodeURIComponent("晾衣机"));
  html = clean(await r.text());
  check("搜「晾衣机」有命中", html.includes("命中") && html.includes("零售渠道-2026晾衣机"));
  check("  结果带页码", /第\s*\d+\s*页/.test(html));
  check("  结果带看原文链接", html.includes("#page="));

  // 3) 搜物料代码
  r = await fetch(base + "/ask?q=520037020800");
  html = clean(await r.text());
  check("搜物料代码 520037020800", html.includes("欧普家用智能照明在售清单"));

  // 4) 搜系列名
  r = await fetch(base + "/ask?q=" + encodeURIComponent("天境Lite"));
  html = clean(await r.text());
  check("搜「天境Lite」", html.includes("天境"));

  // 5) 搜不到
  r = await fetch(base + "/ask?q=zzzznotexist");
  html = clean(await r.text());
  check("空结果提示", html.includes("没搜到"));

  // 6) 入口链接
  r = await fetch(base + "/resources");
  html = clean(await r.text());
  check("资料中心有 /ask 入口", html.includes('href="/ask"'));
}

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
