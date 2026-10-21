# 用户第二批照片（11 张）：
#   1-4  -> 案例 8
#   5-8  -> 案例 9
#   9-11 -> 案例 10
# 处理：去 EXIF、长边 1600、q82，输出 public/demo/cases/0N-i.jpg
import os, json
from PIL import Image, ImageOps

ATT = r"C:\Users\Graves\.dsh\attachments\v1\objects"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "demo", "cases")

SRC = [
    "bd/bddece3c18481d7e8b832cada7bcdf433507a71fef701ced49ebf3daa477dfc1",
    "17/170db85506b953dc6c692ff9b01ff618f39c9e7f9c4a968118c7a78476f7c91d",
    "12/1225c13b703d4c33d68423ccb3fbe1291c514d1f3060bed45ecb6f7fa94d4641",
    "cb/cb2a8e733959a5200b9023dda91b4e36756fd1c99fdb36d74055c2a28034bf28",
    "f6/f6c2aa2ae6d9c8178fa04b3d18a4e3b5a86391879037a386423f63426cf307a7",
    "7b/7bd9a63c0f5478c1f8cf994b0e5d3368d7d6f422a58730148d958d4a54393081",
    "00/009471bbbace61695e7c73d91291081ffee52ceef89d95928e202d0c3d1cb771",
    "ef/ef831b02bfeb7877fa3b4c29a2c59c7eb8514376432db52d66fbb5685dad163e",
    "d8/d885b6e4fecafa17983f1ef5d918e09aaef4b8c4ed7be2f04077813d6b0cde21",
    "d1/d19de638ceaf1c9ac74c1e1afa3e7993940234bf38ccd4ef8fd1041550b62e02",
    "1c/1c43a841da543c16770d5bcc03d2135d903358cb590890c964a867126767134c",
]
GROUPS = {8: [1, 2, 3, 4], 9: [5, 6, 7, 8], 10: [9, 10, 11]}

MAX_EDGE = 1600
meta = {}
for case_no, idxs in GROUPS.items():
    meta[case_no] = []
    for i, src_idx in enumerate(idxs, start=1):
        src = os.path.join(ATT, SRC[src_idx - 1])
        if not os.path.exists(src):
            print(f"  缺失 #{src_idx}")
            continue
        img = Image.open(src)
        img = ImageOps.exif_transpose(img).convert("RGB")
        w, h = img.size
        s = MAX_EDGE / max(w, h)
        if s < 1:
            img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
        name = f"{case_no:02d}-{i}.jpg"
        path = os.path.join(OUT, name)
        img.save(path, "JPEG", quality=82, optimize=True, progressive=True)
        meta[case_no].append(f"/demo/cases/{name}")
        print(f"  案例{case_no} #{i} <- 第{src_idx}张  {img.size[0]}x{img.size[1]}  {os.path.getsize(path)//1024} KB")

# 清理旧占位图
for f in ["08-cover.jpg", "09-cover.jpg", "09-g1.jpg", "09-g2.jpg", "10-cover.jpg"]:
    p = os.path.join(OUT, f)
    if os.path.exists(p):
        os.remove(p)
        print(f"  删除旧占位 {f}")

# 更新 seed
seed_path = os.path.join(ROOT, "seed", "cases.json")
with open(seed_path, encoding="utf-8") as fh:
    cases = json.load(fh)
for case_no, urls in meta.items():
    c = cases[case_no - 1]
    c["cover"] = urls[0]
    c["media"] = [{"type": "image", "url": u, "title": f"现场实拍 {i + 1}"} for i, u in enumerate(urls)]
    c["hasRealPhotos"] = True
    print(f"  案例{case_no} {c['title']} -> {len(urls)} 张")
with open(seed_path, "w", encoding="utf-8") as fh:
    json.dump(cases, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print("完成")
