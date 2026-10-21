const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(44)} ${ok ? "✅" : "❌"} ${extra}`);
};

async function get(p) {
  const r = await fetch(base + p, { redirect: "follow" });
  return { status: r.status, text: await r.text(), ct: r.headers.get("content-type") };
}

// 列表：案例 2-7 的封面都是真实照片
let { status, text } = await get("/cases");
check("GET /cases 200", status === 200);
for (const n of ["02", "03", "04", "05", "06", "07"]) {
  check(`  列表含 /demo/cases/${n}-1.jpg`, text.includes(`/demo/cases/${n}-1.jpg`));
}
check("  列表含案例1视频角标", text.includes("▶") || text.includes("video"));

// 静态资源
for (const p of ["/demo/cases/01-1.jpg", "/demo/cases/02-1.jpg", "/demo/cases/05-3.jpg"]) {
  const r = await fetch(base + p);
  const buf = await r.arrayBuffer();
  check(`  静态 ${p}`, r.status === 200 && buf.byteLength > 5000, `${r.status} ${(buf.byteLength / 1024).toFixed(0)}KB`);
}
// 视频用 HEAD 检查（8.5MB 不整段拉取）
const vh = await fetch(base + "/demo/cases/demo-lighting.mp4", { method: "HEAD" });
check("  视频 HEAD 200", vh.status === 200, `${vh.headers.get("content-type")} ${vh.headers.get("content-length")} bytes`);

// 案例 1 详情：3 图 + 视频
({ status, text } = await get("/cases/1"));
check("GET /cases/1 200", status === 200);
check("  有视频 <video>", /<video/.test(text) && text.includes("demo-lighting.mp4"));
check("  相册含 01-1/01-2/01-3", text.includes("/demo/cases/01-1.jpg") && text.includes("/demo/cases/01-2.jpg") && text.includes("/demo/cases/01-3.jpg"));
check("  视频 poster", text.includes("poster="));

// 案例 5（4 张图、无视频）
({ status, text } = await get("/cases/5"));
check("GET /cases/5 200", status === 200);
check("  相册 4 张", ["05-1", "05-2", "05-3", "05-4"].every((n) => text.includes(`/demo/cases/${n}.jpg`)));
check("  无视频标签", !/<video/.test(text));

// 案例 8/10 仍是占位图
({ status, text } = await get("/cases/8"));
check("GET /cases/8 200（占位图回落）", status === 200 && text.includes("/demo/cases/08-cover.jpg"));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
