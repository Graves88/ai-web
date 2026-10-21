// 把案例 2-7 的 cover/media 指向用户提供的真实照片（public/demo/cases/0N-*.jpg）
import fs from "node:fs";

const path = "seed/cases.json";
const cases = JSON.parse(fs.readFileSync(path, "utf8"));

// 分组：案例号 -> 图片张数（与 scripts/process-real-photos.py 的 GROUPS 一致）
const COUNTS = { 2: 3, 3: 4, 4: 3, 5: 4, 6: 3, 7: 3 };

for (const [noStr, count] of Object.entries(COUNTS)) {
  const no = Number(noStr);
  const c = cases[no - 1];
  if (!c) continue;
  const pad = String(no).padStart(2, "0");
  const media = Array.from({ length: count }, (_, i) => ({
    type: "image",
    url: `/demo/cases/${pad}-${i + 1}.jpg`,
    title: `现场实拍 ${i + 1}`,
  }));
  c.cover = media[0].url;
  c.media = media; // 案例 4 原来的演示视频一并移除（已有真实照片）
  c.hasRealPhotos = true;
}

fs.writeFileSync(path, JSON.stringify(cases, null, 2) + "\n", "utf8");
console.log("已更新案例 2-7 的 cover/media：");
for (const no of Object.keys(COUNTS)) {
  const c = cases[Number(no) - 1];
  console.log(`  案例${no} ${c.title} -> ${c.media.length} 张，cover=${c.cover}`);
}
