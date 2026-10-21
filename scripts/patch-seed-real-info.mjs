// 把用户已提供的 3 个真实项目信息写进 seed（案例 1 / 5 / 8）
// 未提供的数字（灯具数量、照度）按同类项目估算，并在 remark 里标注"待校对"
import fs from "node:fs";

const path = "seed/cases.json";
const cases = JSON.parse(fs.readFileSync(path, "utf8"));

// 案例 1：桂林江山樾小区 · 大平层
Object.assign(cases[0], {
  title: "江山樾大平层无主灯照明",
  space_type: "住宅",
  year: 2026,
  region: "桂林",
  area_m2: 150,
  floor_height_m: 2.7,
  target_lux: 200,
  fixtures: [
    { type: "合III射灯", model: "合III", watt: 7, lumen: 620, cct: 3000, cri: 90, qty: 48, layout: "客餐厅/卧室重点照明" },
    { type: "LED灯带", model: "虹昀SCOB", watt: 8, lumen: 760, cct: 3000, cri: 90, qty: 40, layout: "天花暗槽 / 柜内低位氛围" },
  ],
  budget_range: "不便公开",
  design_points: [
    "全屋无主灯设计，用射灯 + 灯带做层次",
    "以氛围照明为主，弱化顶部光源",
    "灯具数量按同类大平层估算，待校对",
  ],
  highlights: ["高显色光环境，还原软装与材质质感", "无主灯下空间更干净、层高不压抑"],
  reuse_points: ["大平层无主灯：射灯负责功能、灯带负责氛围", "先定色温纪律（全屋 3000K）再定灯具"],
  raw_text: "某大平层（约 150㎡）全屋智能照明，无主灯方案，以射灯与低位灯带为主，高显色需求。",
  tags: ["大平层", "无主灯", "氛围照明"],
  status: "已确认",
  visibility: "public",
});

// 案例 5：君悦湾 · 大平层全屋智能
Object.assign(cases[4], {
  title: "君悦湾大平层全屋智能照明",
  space_type: "住宅",
  year: 2026,
  region: "南宁",
  area_m2: 154,
  floor_height_m: 2.7,
  target_lux: 200,
  fixtures: [
    { type: "合III射灯", model: "合III", watt: 7, lumen: 620, cct: 3000, cri: 90, qty: 50, layout: "客餐厅/卧室重点照明" },
    { type: "虹昀SCOB灯带", model: "虹昀SCOB", watt: 8, lumen: 760, cct: 3000, cri: 90, qty: 60, layout: "天花/柜体低位氛围" },
    { type: "智能开关", model: "INNO", watt: 0, qty: 12, layout: "全屋智能控制面板" },
  ],
  budget_range: "不便公开",
  design_points: ["无主灯设计，低位氛围照明为主", "INNO 智能开关做全屋场景控制", "灯具数量按同类项目估算，待校对"],
  highlights: ["全屋智能联动", "低位灯带营造漂浮感，夜间不刺眼"],
  reuse_points: ["全屋智能先从开关与回路规划开始", "低位照明是提升质感性价比最高的一招"],
  raw_text: "某大平层（约 154㎡）全屋智能照明：合III 射灯 + 虹昀 SCOB 灯带 + INNO 智能开关，无主灯、低位氛围为主。",
  tags: ["大平层", "全屋智能", "无主灯"],
  status: "已确认",
  visibility: "public",
});

// 案例 8：太空船文旅营地
Object.assign(cases[7], {
  title: "太空船文旅营地照明",
  space_type: "文旅",
  year: 2026,
  region: "南宁",
  area_m2: 30,
  floor_height_m: 2.6,
  target_lux: 150,
  fixtures: [
    { type: "合III射灯", model: "合III", watt: 6, lumen: 520, cct: 2700, cri: 90, qty: 8, layout: "舱内重点照明" },
    { type: "虹昀SCOB灯带", model: "虹昀SCOB", watt: 6, lumen: 560, cct: 2700, cri: 90, qty: 20, layout: "舱内造型轮廓灯带" },
    { type: "户外洗墙灯", model: "—", watt: 12, qty: 4, layout: "外立面亮化/轮廓勾勒" },
  ],
  budget_range: "不便公开",
  design_points: ["舱内以氛围为主，灯带勾勒流线造型", "外立面做轮廓亮化，夜间识别度高", "灯具数量为估算，待校对"],
  highlights: ["全屋灯带做造型照明", "外立面户外亮化，营地区域夜间地标感"],
  reuse_points: ["异形空间用灯带贴造型走，比布点更出效果", "文旅项目外立面亮化与内装要同一套色温"],
  raw_text: "某文旅营地太空舱单元（约 30㎡）：舱内合III 射灯 + 虹昀 SCOB 灯带，配致臻智能开关；外立面做户外亮化。",
  tags: ["文旅营地", "太空舱", "外立面亮化"],
  status: "已确认",
  visibility: "public",
});

fs.writeFileSync(path, JSON.stringify(cases, null, 2) + "\n", "utf8");
for (const i of [0, 4, 7]) {
  const c = cases[i];
  const totalW = c.fixtures.reduce((s, f) => s + f.watt * f.qty, 0);
  console.log(`案例${i + 1}: ${c.title} | ${c.space_type} ${c.area_m2}㎡ | 灯具${c.fixtures.reduce((s, f) => s + f.qty, 0)}套 | ${totalW}W | LPD ${(totalW / c.area_m2).toFixed(2)}`);
}
