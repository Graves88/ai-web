const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(44)} ${ok ? "✅" : "❌"} ${extra}`);
};

// 1) 页面含 AI 问答表单
let r = await fetch(base + "/ask");
let html = (await r.text()).replace(/<!--.*?-->/g, "");
check("GET /ask 200", r.status === 200);
check("  含 AI 问答输入框", html.includes("问一句"));
check("  含关键词检索区", html.includes("关键词检索"));

// 2) 参数校验
r = await fetch(base + "/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: "a" }),
});
check("问题过短被拒 400", r.status === 400);

// 3) 真正问一句（会调用模型）
const q = "晾衣机有哪些新品？";
const t0 = Date.now();
r = await fetch(base + "/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: q }),
});
check("POST /api/ask 200", r.status === 200, `${r.headers.get("content-type")}`);

const reader = r.body.getReader();
const dec = new TextDecoder();
let buf = "",
  answer = "",
  sources = [],
  chunks = 0;
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
    if (!p || p === "[DONE]") continue;
    try {
      const j = JSON.parse(p);
      if (j.sources) sources = j.sources;
      if (j.delta) {
        chunks++;
        answer += j.delta;
      }
    } catch {}
  }
}
const ms = Date.now() - t0;
check("  流式返回分块", chunks > 5, `${chunks} 块`);
check("  返回引用来源", sources.length > 0, `${sources.length} 条`);
check("  回答含出处标注", /第\s*\d+\s*页|〔.*第.*页〕|第\d+页/.test(answer), answer.slice(0, 80));
check("  回答提到晾衣机/相关产品", /晾衣机|台灯|新品/.test(answer), `${answer.length} 字 ${ms}ms`);

console.log("\n--- 回答全文 ---");
console.log(answer.slice(0, 600));
console.log("\n--- 引用 ---");
console.log(sources.map((s) => `${s.doc} 第${s.page}页`).join("\n"));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
