# 把用户提供的真实项目照片处理成演示素材：
# - 长边缩到 1600、JPEG q82、去掉 EXIF/GPS（隐私）
# - 输出到 public/demo/cases/0N-1.jpg, 0N-2.jpg ...
# 分组（按用户指定顺序）：
#   1-3  -> 案例 2
#   4-7  -> 案例 3
#   8-10 -> 案例 4
#   11-14-> 案例 5
#   15-17-> 案例 6
#   18-20-> 案例 7
import os
from PIL import Image, ImageOps

RAW = r"D:\deepseek work\data\media\raw"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "demo", "cases")
os.makedirs(OUT, exist_ok=True)

GROUPS = {
    2: [1, 2, 3],
    3: [4, 5, 6, 7],
    4: [8, 9, 10],
    5: [11, 12, 13, 14],
    6: [15, 16, 17],
    7: [18, 19, 20],
}

MAX_EDGE = 1600
total = 0
for case_no, idxs in GROUPS.items():
    for i, src_idx in enumerate(idxs, start=1):
        src = os.path.join(RAW, f"{src_idx:02d}.jpg")
        if not os.path.exists(src):
            print(f"  跳过缺失 {src}")
            continue
        img = Image.open(src)
        img = ImageOps.exif_transpose(img)  # 先按 EXIF 方向转正
        img = img.convert("RGB")            # 转换后保存即丢弃 EXIF（无 GPS/机型信息）
        w, h = img.size
        scale = MAX_EDGE / max(w, h)
        if scale < 1:
            img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        name = f"{case_no:02d}-{i}.jpg"
        path = os.path.join(OUT, name)
        img.save(path, "JPEG", quality=82, optimize=True, progressive=True)
        kb = os.path.getsize(path) / 1024
        total += kb
        print(f"  案例{case_no} #{i} <- 原始{src_idx:02d}.jpg  {img.size[0]}x{img.size[1]}  {kb:.0f} KB  {name}")

print(f"\n共输出 {sum(len(v) for v in GROUPS.values())} 张，合计 {total:.0f} KB")
