const base = "http://127.0.0.1:3100";
const json = { "Content-Type": "application/json" };

// 先在数据库里插一条"仅在 SQLite 中存在"的数据，用来证明演示模式没读数据库
const { DatabaseSync } = await import("node:sqlite");
const db = new DatabaseSync("D:/deepseek work/data/cases.db");
const tempTitle = "【DB临时】演示模式不应显示";
db.prepare(
  `INSERT INTO cases (title, space_type, year, fixtures, total_w, lpd, status, visibility, tags)
   VALUES (?, '办公', 2026, '[]', 0, 0, '待校对', 'private', '[]')`,
).run(tempTitle);
const tempId = db.prepare("SELECT last_insert_rowid() AS id").get().id;
console.log(`已插入数据库临时行 id=${tempId}（用于验证演示模式数据源）`);

function line(label, ok, extra = "") {
  console.log(`${label.padEnd(26)} ${ok ? "✅" : "❌"} ${extra}`);
}

// 1) 首页应重定向到 /cases
let r = await fetch(base + "/", { redirect: "manual" });
line("GET / 重定向", [307, 308].includes(r.status), `-> ${r.status} ${r.headers.get("location") ?? ""}`);

// 2) 列表页只读、且数据来自 seed（不含数据库临时行）
r = await fetch(base + "/cases");
let html = await r.text();
line("GET /cases 200", r.status === 200);
line("  显示只读演示标识", html.includes("只读演示版"));
line("  不含数据库临时行", !html.includes("DB临时"));
line("  含 seed 案例", html.includes("某住宅小区公共区域智能照明"));

// 3) 详情页
r = await fetch(base + "/cases/9");
html = await r.text();
line("GET /cases/9 200", r.status === 200);
line("  显示只读演示标识", html.includes("只读演示版"));
line("  隐藏编辑按钮", !html.includes(">编辑<"));
line("  AI 面板标注演示", html.includes("演示：预生成解读"));

// 4) 预生成解读流（不需要 API key）
r = await fetch(base + "/api/interpret", { method: "POST", headers: json, body: JSON.stringify({ caseId: 9 }) });
line("POST /api/interpret 200", r.status === 200, `ctype=${r.headers.get("content-type")}`);
const reader = r.body.getReader();
const dec = new TextDecoder();
let buf = "";
let chunks = 0;
let text = "";
let done = false;
while (true) {
  const { done: d, value } = await reader.read();
  if (d) break;
  buf += dec.decode(value, { stream: true });
  const events = buf.split("\n\n");
  buf = events.pop() ?? "";
  for (const ev of events) {
    const l = ev.split("\n").find((x) => x.startsWith("data:"));
    if (!l) continue;
    const p = l.slice(5).trim();
    if (p === "[DONE]") {
      done = true;
      continue;
    }
    try {
      const j = JSON.parse(p);
      if (j.delta) {
        chunks++;
        text += j.delta;
      }
    } catch {}
  }
}
line("  流式块数 > 10", chunks > 10, `chunks=${chunks}`);
line("  [DONE] 标记", done);
line("  内容长度合理", text.length > 150, `len=${text.length}`);

// 5) 写操作一律 403
for (const [label, method, path] of [
  ["POST /api/cases", "POST", "/api/cases"],
  ["PUT /api/cases/9", "PUT", "/api/cases/9"],
  ["DELETE /api/cases/9", "DELETE", "/api/cases/9"],
]) {
  const res = await fetch(base + path, {
    method,
    headers: json,
    body: method === "DELETE" ? undefined : JSON.stringify({ title: "x", space_type: "办公", fixtures: [{ type: "a", watt: 1, qty: 1 }] }),
  });
  line(`${label} 403`, res.status === 403, `-> ${res.status}`);
}

// 6) 新建/编辑页重定向
for (const path of ["/cases/new", "/cases/9/edit"]) {
  const res = await fetch(base + path, { redirect: "manual" });
  line(`GET ${path} 重定向`, [307, 308].includes(res.status), `-> ${res.status}`);
}

// 7) 清理临时行
db.prepare("DELETE FROM cases WHERE id = ?").run(tempId);
console.log(`已清理数据库临时行 id=${tempId}`);
