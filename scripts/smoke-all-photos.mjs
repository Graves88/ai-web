const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(46)} ${ok ? "✅" : "❌"} ${extra}`);
};
const get = async (p) => {
  const r = await fetch(base + p, { redirect: "follow" });
  return { status: r.status, text: await r.text() };
};

const { status, text } = await get("/cases");
check("GET /cases 200", status === 200);
// 10 个案例现在都应有真实封面
for (let n = 1; n <= 10; n++) {
  const pad = String(n).padStart(2, "0");
  check(`  列表封面 ${pad}-1.jpg`, text.includes(`/demo/cases/${pad}-1.jpg`));
}

for (const [n, count] of Object.entries({ 1: 3, 2: 3, 3: 4, 4: 3, 5: 4, 6: 3, 7: 3, 8: 4, 9: 4, 10: 3 })) {
  const { status, text } = await get(`/cases/${n}`);
  const pad = String(n).padStart(2, "0");
  const okImgs = Array.from({ length: count }, (_, i) => `/demo/cases/${pad}-${i + 1}.jpg`).every((u) => text.includes(u));
  check(`案例${pad} 详情 200 + ${count} 张相册`, status === 200 && okImgs);
}

// 抽查第二批静态资源
for (const p of ["/demo/cases/08-1.jpg", "/demo/cases/09-4.jpg", "/demo/cases/10-3.jpg"]) {
  const r = await fetch(base + p);
  const buf = await r.arrayBuffer();
  check(`静态 ${p}`, r.status === 200 && buf.byteLength > 5000, `${r.status} ${(buf.byteLength / 1024).toFixed(0)}KB`);
}

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
