const base = "http://127.0.0.1:3100";

async function check(path, expect) {
  try {
    const res = await fetch(base + path);
    const text = await res.text();
    const ok = res.status === 200;
    console.log(`GET ${path} -> ${res.status} (${text.length} bytes) ${ok ? "✅" : "❌"}`);
    if (ok && expect) {
      const hit = expect.every((kw) => text.includes(kw));
      console.log(`   包含关键词 ${JSON.stringify(expect)}: ${hit ? "✅" : "❌ 未命中"}`);
    }
    return text;
  } catch (e) {
    console.log(`GET ${path} -> 请求失败: ${e.message}`);
    return "";
  }
}

const listHtml = await check("/cases", ["照明落地案例库", "某住宅小区公共区域智能照明"]);
if (listHtml) {
  const m = listHtml.match(/href="\/cases\/(\d+)"/);
  console.log("    列表里第一个案例链接:", m ? `/cases/${m[1]}` : "❌ 没找到");
  if (m) {
    await check(`/cases/${m[1]}`, ["灯具清单", "代码计算", "设计要点"]);
  }
}
await check("/", ["AI 调试页", "案例库"]);
