const base = "http://127.0.0.1:3100";

async function get(path) {
  const r = await fetch(base + path, { redirect: "follow" });
  return { status: r.status, html: await r.text() };
}

const results = [];
function check(label, ok, extra = "") {
  results.push(ok);
  console.log(`${label.padEnd(36)} ${ok ? "✅" : "❌"} ${extra}`);
}

// 列表页（小红书式瀑布流）
let { status, html } = await get("/cases");
check("GET /cases 200", status === 200);
check("  瀑布流 columns-2", html.includes("columns-2"));
check("  卡片样式 card-surface", html.includes("card-surface"));
check("  不同高度封面 aspect-[3/4]", html.includes("aspect-[3/4]"));
check("  场所频道胶囊", html.includes("rounded-full"));
check("  品牌标题", html.includes("照明落地案例库"));
check("  含 viewport meta", /name="viewport"/.test(html));

// 详情页
const m = html.match(/href="\/cases\/(\d+)"/);
const caseId = m ? m[1] : null;
check("列表能取到案例 id", Boolean(caseId), caseId ? `id=${caseId}` : "");
({ status, html } = await get(`/cases/${caseId}`));
check(`GET /cases/${caseId} 200`, status === 200);
check("  封面 hero", html.includes("aspect-[4/3]"));
check("  灯具清单", html.includes("灯具清单"));
check("  手机卡片 sm:hidden", html.includes("sm:hidden"));
check("  桌面表格 hidden overflow-x-auto", html.includes("hidden overflow-x-auto"));
check("  AI 解读面板", html.includes("AI 解读"));

// 首页
({ status, html } = await get("/"));
check("GET / 200", status === 200);

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((r) => !r)) process.exit(1);
