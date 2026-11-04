# 裁剪截图（只保留有内容的部分），供 PPT 使用
import os
from PIL import Image

SRC = r"D:\deepseek work\export\shots"
OUT = r"D:\deepseek work\export\shots\crop"
os.makedirs(OUT, exist_ok=True)

# cases：保留顶部到第二行卡片
img = Image.open(os.path.join(SRC, "cases.png"))
img.crop((0, 0, img.width, min(1010, img.height))).save(os.path.join(OUT, "cases.png"))

# ask：只要上半部分（有命中列表）
img = Image.open(os.path.join(SRC, "ask.png"))
img.crop((0, 0, img.width, min(770, img.height))).save(os.path.join(OUT, "ask.png"))

# resources：检查后裁剪
img = Image.open(os.path.join(SRC, "resources.png"))
img.crop((0, 0, img.width, min(900, img.height))).save(os.path.join(OUT, "resources.png"))

# detail：取顶部参数区
img = Image.open(os.path.join(SRC, "detail.png"))
img.crop((0, 0, img.width, min(900, img.height))).save(os.path.join(OUT, "detail.png"))

for f in os.listdir(OUT):
    p = os.path.join(OUT, f)
    im = Image.open(p)
    print(f, im.size, f"{os.path.getsize(p)//1024} KB")
