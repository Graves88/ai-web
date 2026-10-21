const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(44)} ${ok ? "✅" : "❌"} ${extra}`);
};
const get = async (p) => {
  const r = await fetch(base + p, { redirect: "follow" });
  return { status: r.status, text: await r.text() };
};

let { status, text } = await get("/cases");
check("GET /cases 200", status === 200);
check("  标题：江山樾大平层无主灯照明", text.includes("江山樾大平层无主灯照明"));
check("  标题：君悦湾大平层全屋智能照明", text.includes("君悦湾大平层全屋智能照明"));
check("  标题：太空船文旅营地照明", text.includes("太空船文旅营地照明"));
check("  频道含文旅", text.includes("文旅"));

({ status, text } = await get("/cases/1"));
check("GET /cases/1 200", status === 200);
check("  含 大平层/无主灯标签", text.includes("大平层") && text.includes("无主灯"));
check("  含 LPD 4.37", text.includes("4.37"));
check("  含视频", /<video/.test(text));

({ status, text } = await get("/cases/8"));
check("GET /cases/8 200", status === 200);
check("  文旅营地 + 太空舱", text.includes("文旅营地") && text.includes("太空舱"));
check("  含 LPD 7.2", text.includes("7.2"));

// 文旅筛选
({ status, text } = await get("/cases?space=" + encodeURIComponent("文旅")));
check("筛选 文旅 -> 200", status === 200);
check("  命中太空船", text.includes("太空船"));
check("  不含君悦湾", !text.includes("君悦湾"));

// 重新生成的解读是否已生效（案例1）
const r = await fetch(base + "/api/interpret", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ caseId: 1 }),
});
const reader = r.body.getReader();
const dec = new TextDecoder();
let buf = "",
  chunks = 0,
  out = "";
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
        chunks++;
        out += j.delta;
      }
    } catch {}
  }
}
check("案例1 解读已更新（含无主灯/大平层）", /无主灯|大平层|射灯|灯带/.test(out), `${chunks} 块 ${out.length} 字`);

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
