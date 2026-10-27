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

// 1) 搜索：灯具型号
let r = await get("/cases?q=" + encodeURIComponent("合III"));
check("搜索 灯具型号 合III 有结果", r.status === 200 && r.text.includes("江山樾"));
r = await get("/cases?q=" + encodeURIComponent("CX20"));
check("搜索 CX20 命中", r.status === 200 && r.text.includes("五象院子"));
r = await get("/cases?q=" + encodeURIComponent("中古风"));
check("搜索 标签/要点 中古风", r.status === 200 && r.text.includes("北投印象"));
r = await get("/cases?q=" + encodeURIComponent("玉林"));
check("搜索 城市 玉林", r.status === 200 && r.text.includes("碧桂园"));

// 2) 城市筛选
r = await get("/cases?city=" + encodeURIComponent("南宁"));
check("城市筛选 南宁", r.status === 200 && r.text.includes("君悦湾") && !r.text.includes("碧桂园"));
r = await get("/cases?city=" + encodeURIComponent("桂林"));
check("城市筛选 桂林（仅 1 条）", r.status === 200 && r.text.includes("江山樾") && !r.text.includes("君悦湾"));

// 3) 灯具筛选
r = await get("/cases?fixture=" + encodeURIComponent("CX20"));
check("灯具筛选 CX20", r.status === 200 && r.text.includes("五象院子") && r.text.includes("上水湾"));
r = await get("/cases?fixture=" + encodeURIComponent("虹昀SCOB"));
check("灯具筛选 虹昀SCOB", r.status === 200 && r.text.includes("江山樾"));

// 4) 组合筛选
r = await get("/cases?city=" + encodeURIComponent("南宁") + "&fixture=" + encodeURIComponent("CX20"));
check("组合筛选 南宁+CX20", r.status === 200 && r.text.includes("五象院子") && !r.text.includes("北投印象"));

// 5) 频道行是否渲染
r = await get("/cases");
check("页面含 城市/灯具 筛选行", r.text.includes(">城市<") && r.text.includes(">灯具<"));

// 6) 资料中心
r = await get("/resources");
check("GET /resources 200", r.status === 200);
check("  含灯具参数速查表", r.text.includes("照明灯具参数速查表"));
check("  含下载链接", r.text.includes("/resources/fixtures-spec.pdf"));
const pdf = await fetch(base + "/resources/fixtures-spec.pdf");
const buf = await pdf.arrayBuffer();
check("PDF 可下载", pdf.status === 200 && buf.byteLength > 50000, `${pdf.headers.get("content-type")} ${(buf.byteLength / 1024).toFixed(0)}KB`);

// 7) 列表页有资料入口
r = await get("/cases");
check("列表页有 /resources 入口", r.text.includes('href="/resources"'));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
