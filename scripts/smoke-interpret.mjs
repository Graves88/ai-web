const base = "http://127.0.0.1:3100";

async function post(path, body, opts = {}) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...opts,
  });
  return res;
}

// 1) 参数校验
for (const [label, body, expect] of [
  ["caseId 缺失", {}, 400],
  ["caseId 非法", { caseId: "abc" }, 400],
  ["caseId 不存在", { caseId: 99999 }, 404],
]) {
  const r = await post("/api/interpret", body);
  console.log(`${label.padEnd(14)} -> ${r.status} ${r.status === expect ? "✅" : `❌ 期望 ${expect}`}`);
}

// 2) 流式输出
console.log("\n--- 流式解读（真实调用一次）---");
const t0 = Date.now();
const res = await post("/api/interpret", { caseId: 9 });
console.log("status:", res.status, "| content-type:", res.headers.get("content-type"));
if (!res.ok || !res.body) {
  console.log("❌ 没有流式响应：", await res.text());
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = "";
let chunks = 0;
let firstDeltaAt = 0;
let text = "";
let sawDone = false;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";
  for (const ev of events) {
    const line = ev.split("\n").find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") {
      sawDone = true;
      continue;
    }
    try {
      const j = JSON.parse(payload);
      if (j.delta) {
        chunks++;
        if (!firstDeltaAt) firstDeltaAt = Date.now() - t0;
        text += j.delta;
      }
      if (j.error) console.log("服务端错误事件:", j.error);
    } catch {
      /* ignore */
    }
  }
}

console.log(`分块数: ${chunks}`);
console.log(`TTFT(首块到达): ${firstDeltaAt} ms | 总耗时: ${Date.now() - t0} ms`);
console.log(`[DONE] 标记: ${sawDone ? "✅" : "❌"}`);
console.log("输出前 120 字：", JSON.stringify(text.slice(0, 120)));
console.log("\n--- 中止测试（读到第 3 块就 abort）---");
const ac = new AbortController();
const res2 = await post("/api/interpret", { caseId: 9 }, { signal: ac.signal });
const r2 = res2.body.getReader();
let n = 0;
while (true) {
  const { done } = await r2.read();
  if (done) break;
  if (++n >= 3) {
    ac.abort();
    break;
  }
}
console.log(`拿到 ${n} 块后中止：${ac.signal.aborted ? "✅ 客户端已 abort" : "❌"}`);
