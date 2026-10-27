# 生成"灯具参数速查表"PDF（演示用，真实产品彩页可后续替换）
import os, json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "resources")
os.makedirs(OUT, exist_ok=True)
FONT = "C:/Windows/Fonts/msyh.ttc"

with open(os.path.join(ROOT, "seed", "cases.json"), encoding="utf-8") as f:
    cases = json.load(f)

# 按型号聚合：型号 -> {类型, 功率, 色温, CRI, 用例}
agg = {}
for c in cases:
    for fx in c.get("fixtures", []):
        key = (fx.get("model") or fx.get("type"), fx.get("type"), fx.get("watt"), fx.get("cct"), fx.get("cri"))
        if key not in agg:
            agg[key] = set()
        agg[key].add(c["title"].replace("（示例）", ""))

W, H = 1240, 1754  # A4 @150dpi
img = Image.new("RGB", (W, H), (250, 249, 246))
d = ImageDraw.Draw(img)
f_title = ImageFont.truetype(FONT, 40)
f_sub = ImageFont.truetype(FONT, 20)
f_head = ImageFont.truetype(FONT, 21)
f_body = ImageFont.truetype(FONT, 19)

d.text((70, 60), "照明灯具参数速查表", font=f_title, fill=(28, 25, 23))
d.text((70, 120), "示例资料 · 由案例库自动汇总 · 可按型号检索", font=f_sub, fill=(120, 113, 108))
d.line([(70, 165), (W - 70, 165)], fill=(220, 214, 206), width=2)

cols = [("型号/类型", 70, 330), ("功率", 400, 120), ("色温", 520, 110), ("Ra", 630, 80), ("用到的项目", 710, W - 770)]
y = 195
for name, x, w in cols:
    d.text((x, y), name, font=f_head, fill=(87, 83, 78))
y += 42
d.line([(70, y), (W - 70, y)], fill=(235, 231, 225), width=1)
y += 14

for (model, ftype, watt, cct, cri), used in sorted(agg.items(), key=lambda kv: (str(kv[0][1] or ""), str(kv[0][0]))):
    if y > H - 120:
        break
    label = f"{model}" if model else (ftype or "—")
    d.text((70, y), str(label)[:16], font=f_body, fill=(28, 25, 23))
    d.text((400, y), f"{watt}W", font=f_body, fill=(68, 64, 60))
    d.text((520, y), f"{cct}K" if cct else "—", font=f_body, fill=(68, 64, 60))
    d.text((630, y), f"Ra{cri}" if cri else "—", font=f_body, fill=(68, 64, 60))
    names = "、".join(sorted(used))[:26]
    d.text((710, y), names, font=f_body, fill=(87, 83, 78))
    y += 38
    d.line([(70, y - 6), (W - 70, y - 6)], fill=(240, 237, 232), width=1)

d.text((70, H - 80), "说明：仅供演示，数据来自案例库 seed；替换成真实产品彩页时保持同名文件即可。", font=f_sub, fill=(150, 143, 136))

pdf_path = os.path.join(OUT, "fixtures-spec.pdf")
img.save(pdf_path, "PDF", resolution=150.0)
print("生成", pdf_path, f"{os.path.getsize(pdf_path)//1024} KB")

# 汇总资源清单
files = []
for name, title, desc, tags in [
    ("fixtures-spec.pdf", "照明灯具参数速查表", "按型号汇总功率/色温/显色指数与使用项目", ["产品参数", "速查"]),
]:
    p = os.path.join(OUT, name)
    files.append({
        "title": title,
        "description": desc,
        "url": f"/resources/{name}",
        "sizeKB": round(os.path.getsize(p) / 1024),
        "updatedAt": "2026-10-27",
        "tags": tags,
    })

with open(os.path.join(ROOT, "seed", "resources.json"), "w", encoding="utf-8") as fh:
    json.dump(files, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print("生成 seed/resources.json，共", len(files), "个资源")
