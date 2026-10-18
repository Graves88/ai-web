const base = "http://127.0.0.1:3100";

const r = await fetch(base + "/");
const html = await r.text();
console.log("GET /", r.status, "len", html.length, "has-title", html.includes("AI Web App"));

const r2 = await fetch(base + "/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
});
const t2 = await r2.text();
console.log("POST /api/chat", r2.status, t2.slice(0, 300));
