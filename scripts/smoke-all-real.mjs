const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(42)} ${ok ? "✅" : "❌"} ${extra}`);
};
const get = async (p) => {
  const r = await fetch(base + p, { redirect: "follow" });
  return { status: r.status, text: await r.text() };
};

const TITLES = [
  "江山樾大平层无主灯照明",
  "北投印象住宅智能照明",
  "碧桂园住宅全屋智能照明",
  "五象院子别墅智能照明",
  "君悦湾大平层全屋智能照明",
  "上水湾住宅轻智能照明",
  "澜铂湾住宅全屋智能照明",
  "太空船文旅营地照明",
  "金府大院住宅轻智能照明",
  "九宸府住宅轻智能照明",
];

let { status, text } = await get("/cases");
check("GET /cases 200", status === 200);
for (const t of TITLES) check(`  标题：${t}`, text.includes(t));
check("  含 文旅 频道", text.includes("文旅"));

// 每个详情页都能开，且带自己的照片
const AREAS = ["150", "132", "121", "372", "154", "134", "124", "30", "124", "134"];
for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(2, "0");
  const r = await get(`/cases/${i}`);
  check(`案例${pad} 200 + 相册`, r.status === 200 && r.text.includes(`/demo/cases/${pad}-1.jpg`));
}

// 文旅筛选只命中太空船
({ status, text } = await get("/cases?space=" + encodeURIComponent("文旅")));
check("筛选文旅 → 只命中太空船", status === 200 && text.includes("太空船") && !text.includes("君悦湾"));

// 抽查两条解读是否已更新
for (const [id, needle] of [[2, "中古风"], [4, "别墅"]]) {
  const r = await fetch(base + "/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId: id }),
  });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "",
    out = "",
    n = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const evs = buf.split("\n\n");
    buf = evs.pop() ?? "";
    for (const ev of evs) {
      const line = ev.split("\n").find((x) => x.startsWith("data:"));
      if (!line) continue;
      const p = line.slice(5).trim();
      if (p === "[DONE]") continue;
      try {
        const j = JSON.parse(p);
        if (j.delta) {
          n++;
          out += j.delta;
        }
      } catch {}
    }
  }
  check(`案例${id} 解读含"${needle}"`, out.includes(needle), `${n} 块 ${out.length} 字`);
}

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
