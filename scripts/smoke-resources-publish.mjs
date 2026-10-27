const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(48)} ${ok ? "✅" : "❌"} ${extra}`);
};
const clean = (s) => s.replace(/<!--.*?-->/g, "");
const mode = process.argv[2] ?? "demo";

if (mode === "demo") {
  const r = await fetch(base + "/resources");
  const html = clean(await r.text());
  check("演示：GET /resources 200", r.status === 200);
  check("  显示 11 份公开资料", /11\s*份资料/.test(html));
  check("  含产品资料标题", html.includes("2691新品订货会-吸顶灯") || html.includes("2691新品订货会 吸顶灯"));
  check("  含在售清单", html.includes("欧普家用智能照明"));
  check("  无上传按钮", !html.includes("/resources/upload"));
  check("  下载链指向静态文件", /\/resources\/\d+-product\.pdf/.test(html));

  // 从 seed/resources-public.json 取真实 URL（编号会随分类顺序变化）
  const { default: fs } = await import("node:fs");
  const published = JSON.parse(fs.readFileSync("seed/resources-public.json", "utf8"));
  const samples = [published[0].url, published[published.length - 1].url];
  for (const f of samples) {
    const dl = await fetch(base + f);
    const buf = await dl.arrayBuffer();
    const isPdf = Buffer.from(buf.slice(0, 5)).toString() === "%PDF-";
    check(`  静态下载 ${f}`, dl.status === 200 && isPdf, `${(buf.byteLength / 1024 / 1024).toFixed(1)}MB`);
  }
} else {
  const r = await fetch(base + "/resources");
  const html = clean(await r.text());
  check("本地：GET /resources 200", r.status === 200);
  check("  共 11 份（含内部）", /11\s*份资料/.test(html));
  check("  显示「公网可见」标记", html.includes("公网可见"));
  check("  显示「仅内部」标记", html.includes("仅内部"));
  check("  含在售清单", html.includes("在售清单"));
  // 内部文件仍走接口下载
  const apiHtml = await (await fetch(base + "/api/resources")).json();
  const price = apiHtml.items.find((x) => x.title.includes("在售清单"));
  check("  内部在售清单可经 API 下载", !!price);
  if (price) {
    const dl = await fetch(base + `/api/resources/${price.id}/download`);
    const buf = await dl.arrayBuffer();
    check("  在售清单 PDF 大小正常", dl.status === 200 && buf.byteLength > 1_000_000, `${(buf.byteLength / 1024).toFixed(0)}KB`);
  }
}

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
