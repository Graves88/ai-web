// 一次性脚本：给 seed/cases.json 的 10 个案例补上 cover / media 字段（指向 public/demo/cases/）
// 用法：node scripts/patch-seed-media.mjs
import fs from "node:fs";

const path = "seed/cases.json";
const cases = JSON.parse(fs.readFileSync(path, "utf8"));

const img = (n) => `/demo/cases/${String(n).padStart(2, "0")}-cover.jpg`;
const gallery = (n, k) => `/demo/cases/${String(n).padStart(2, "0")}-g${k}.jpg`;
const VIDEO = "/demo/cases/demo-lighting.mp4";

cases.forEach((c, i) => {
  const n = i + 1;
  const media = [{ type: "image", url: img(n), title: `${c.title} · 效果图` }];
  if ([1, 4, 9].includes(n)) {
    media.push({ type: "image", url: gallery(n, 1), title: "布灯平面示意" });
    media.push({ type: "image", url: gallery(n, 2), title: "局部灯光细节" });
  }
  if ([1, 4].includes(n)) {
    media.push({ type: "video", url: VIDEO, poster: img(n), title: "现场效果 · 演示视频" });
  }
  c.cover = img(n);
  c.media = media;
});

fs.writeFileSync(path, JSON.stringify(cases, null, 2) + "\n", "utf8");
console.log(`已给 ${cases.length} 个案例补上 cover/media`);
console.log("示例:", JSON.stringify(cases[0].media, null, 2));
