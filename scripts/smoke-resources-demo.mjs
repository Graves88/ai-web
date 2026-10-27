const base = "http://127.0.0.1:3100";
const results = [];
const check = (l, ok, extra = "") => {
  results.push(ok);
  console.log(`${l.padEnd(46)} ${ok ? "✅" : "❌"} ${extra}`);
};

const r = await fetch(base + "/resources");
const html = await r.text();
check("演示模式 /resources 200", r.status === 200);
check("  显示内部资料提示", html.includes("资料中心为内部资料库"));
check("  不泄露真实文件名", !html.includes("君悦湾智能照明") && !html.includes("博越府"));
check("  演示模式无上传按钮", !html.includes("/resources/upload"));

const up = await fetch(base + "/api/resources", { method: "POST", body: new FormData() });
check("演示模式上传被拒 403", up.status === 403);

const dl = await fetch(base + "/api/resources/1/download");
check("演示模式下载被拒 404", dl.status === 404);

const uploadPage = await fetch(base + "/resources/upload", { redirect: "manual" });
check("演示模式上传页重定向", uploadPage.status === 307 || uploadPage.status === 308, String(uploadPage.status));

console.log(`\n通过 ${results.filter(Boolean).length}/${results.length}`);
if (results.some((x) => !x)) process.exit(1);
