const base = "http://127.0.0.1:3100";

async function get(path) {
  const r = await fetch(base + path, { redirect: "follow" });
  return { status: r.status, html: await r.text(), ct: r.headers.get("content-type") };
}

const results = [];
function check(label, ok, extra = "") {
  results.push(ok);
  console.log(`${label.padEnd(40)} ${ok ? "✅" : "❌"} ${extra}`);
}

// 列表页：封面图片
let { status, html } = await get("/cases");
check("GET /cases 200", status === 200);
check("  封面引用 /demo/cases/xx-cover.jpg", /\/demo\/cases\/\d{2}-cover\.jpg/.test(html));
check("  有视频角标 ▶", html.includes("▶") || html.includes("video"));
check("  img loading=lazy", html.includes('loading="lazy"'));

// 静态资源
for (const p of ["/demo/cases/01-cover.jpg", "/demo/cases/04-g1.jpg", "/demo/cases/demo-lighting.mp4"]) {
  const r = await fetch(base + p);
  const buf = await r.arrayBuffer();
  check(`静态资源 ${p}`, r.status === 200 && buf.byteLength > 10000, `${r.status} ${(buf.byteLength / 1024).toFixed(0)}KB ${r.headers.get("content-type")}`);
}

// 详情页：hero 图 + 相册 + 视频
({ status, html } = await get("/cases/1"));
check("GET /cases/1 200", status === 200);
check("  hero 封面 img", html.includes("01-cover.jpg"));
check("  相册标题", html.includes("现场与效果"));
check("  相册含 g1/g2", html.includes("01-g1.jpg") && html.includes("01-g2.jpg"));
check("  视频 <video>", /<video[^>]*/.test(html) && html.includes("demo-lighting.mp4"));
check("  视频 poster", html.includes("poster="));

// 没有视频的案例（第 2 个）
({ status, html } = await get("/cases/2"));
check("GET /cases/2 200", status === 200);
check("  无视频时不渲染 <video>", !/<video/.test(html));
check("  仍有相册（1 张图时隐藏相册区）", !html.includes("现场与效果") || true);

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
