const base = "http://127.0.0.1:3100";

async function get(path) {
  const r = await fetch(base + path);
  return { status: r.status, html: await r.text() };
}

const checks = [];
function check(label, ok, extra = "") {
  checks.push(ok);
  console.log(`${label.padEnd(34)} ${ok ? "✅" : "❌"} ${extra}`);
}

// 列表页
let { status, html } = await get("/cases");
check("GET /cases 200", status === 200);
check("  封面用比例容器 aspect", html.includes("aspect-[16/10]"));
check("  筛选 chips 横向滚动", html.includes("overflow-x-auto"));
check("  手机卡片标题字号 15px", html.includes("text-[15px]"));

// 详情页：手机卡片 + 桌面表格都在 DOM 里（id 从列表页动态取，别写死）
({ status, html } = await get("/cases"));
const m = html.match(/href="\/cases\/(\d+)"/);
const caseId = m ? m[1] : null;
check("列表里能取到案例 id", Boolean(caseId), caseId ? `id=${caseId}` : "");
({ status, html } = await get(`/cases/${caseId}`));
check(`GET /cases/${caseId} 200`, status === 200);
check("  手机灯具卡片 sm:hidden", html.includes("sm:hidden"));
check("  桌面表格 hidden sm:block", html.includes("hidden overflow-x-auto sm:block"));
check("  标题响应式字号", html.includes("text-xl font-semibold sm:text-2xl"));

// 首页（本地非演示模式）
({ status, html } = await get("/"));
check("GET / 200", status === 200);

// viewport meta（防手机缩放）
({ status, html } = await get("/cases"));
check("  含 viewport meta", /name="viewport"/.test(html));

console.log(`\n通过 ${checks.filter(Boolean).length}/${checks.length}`);
if (checks.some((c) => !c)) process.exit(1);
