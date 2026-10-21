// 案例 1 换成用户提供的图片 + 压缩后的现场视频
import fs from "node:fs";

const path = "seed/cases.json";
const cases = JSON.parse(fs.readFileSync(path, "utf8"));

const c = cases[0];
const img = (i) => `/demo/cases/01-${i}.jpg`;
c.cover = img(1);
c.media = [
  { type: "image", url: img(1), title: "现场实拍 1" },
  { type: "image", url: img(2), title: "现场实拍 2" },
  { type: "image", url: img(3), title: "灯光细节" },
  { type: "video", url: "/demo/cases/demo-lighting.mp4", poster: img(1), title: "现场视频（114s，已压缩到 720p）" },
];
c.hasRealPhotos = true;

fs.writeFileSync(path, JSON.stringify(cases, null, 2) + "\n", "utf8");
console.log("案例1:", c.title, "->", c.media.length, "个媒体", "cover=", c.cover);
console.log("\n各案例媒体数：");
cases.forEach((x, i) => console.log(`  ${i + 1}. ${x.title.slice(0, 18)}  media=${(x.media || []).length}  cover=${x.cover || "-"}`));
