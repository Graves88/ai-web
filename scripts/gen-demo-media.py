# 生成演示用占位图 + 演示视频（真实案例图到位后，直接替换同名文件即可）
# 用法：python scripts/gen-demo-media.py
import os, subprocess, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "demo", "cases")
os.makedirs(OUT, exist_ok=True)

FONT = "C:/Windows/Fonts/msyh.ttc"  # 微软雅黑
W, H = 1200, 900

# 每个场所一套色调（和前端 SPACE_GRADIENT 呼应）
PALETTES = {
    "住宅": ((255, 233, 214), (255, 196, 158)),
    "办公": ((216, 235, 255), (168, 200, 250)),
    "教育": ((208, 247, 231), (150, 224, 200)),
    "商业": ((255, 220, 240), (246, 178, 214)),
    "工业": ((226, 230, 235), (188, 196, 206)),
    "景观": ((226, 247, 208), (170, 226, 160)),
    "道路": ((255, 240, 200), (250, 206, 128)),
    "医疗": ((212, 244, 250), (160, 214, 235)),
}

def font(size):
    return ImageFont.truetype(FONT, size)

def gradient(bg_top, bg_bottom):
    img = Image.new("RGB", (W, H), bg_top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(bg_top[i] * (1 - t) + bg_bottom[i] * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    return img

def light_glow(img, seed):
    """柔和光斑 + 斜向光束，模拟照明效果图"""
    rnd = random.Random(seed)
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for _ in range(5):
        cx, cy = rnd.randint(120, W - 120), rnd.randint(80, H - 260)
        r = rnd.randint(120, 260)
        od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255))
    overlay = overlay.filter(ImageFilter.GaussianBlur(90))
    img = Image.blend(img, Image.blend(img, Image.new("RGB", (W, H), (255, 255, 255)), 0.55), 0.0)
    img = Image.composite(Image.new("RGB", (W, H), (255, 255, 255)), img, overlay.convert("L").point(lambda v: int(v * 0.55)))
    # 斜向光束
    beams = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(beams)
    for i in range(3):
        x = 180 + i * 330
        bd.polygon([(x, -100), (x + 150, -100), (x + 520, H + 100), (x + 300, H + 100)], fill=(255, 255, 255, 26))
    beams = beams.filter(ImageFilter.GaussianBlur(28))
    base = img.convert("RGBA")
    base.alpha_composite(beams)
    return base.convert("RGB")

def label_bar(img, title, subtitle, tag):
    img = img.convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 底部渐变蒙层
    for y in range(H - 320, H):
        t = (y - (H - 320)) / 320
        d.line([(0, y), (W, y)], fill=(20, 18, 16, int(150 * t)))
    d.text((64, H - 210), title, font=font(66), fill=(255, 255, 255))
    d.text((66, H - 118), subtitle, font=font(32), fill=(255, 255, 255, 220))
    # 右上角标签
    f = font(26)
    tw = d.textlength(tag, font=f)
    d.rounded_rectangle([W - tw - 96, 44, W - 44, 96], radius=26, fill=(0, 0, 0, 90))
    d.text((W - tw - 70, 60), tag, font=f, fill=(255, 255, 255))
    img.alpha_composite(layer)
    return img.convert("RGB")

def make_cover(name, space_type, title, subtitle, seed, variant="cover"):
    top, bottom = PALETTES.get(space_type, ((240, 240, 240), (200, 200, 200)))
    img = gradient(top, bottom)
    img = light_glow(img, seed)
    if variant == "gallery":
        # 画廊图：加一层"平面/立面示意"网格
        d = ImageDraw.Draw(img, "RGBA")
        for x in range(0, W, 80):
            d.line([(x, 0), (x, H)], fill=(255, 255, 255, 26))
        for y in range(0, H, 80):
            d.line([(0, y), (W, y)], fill=(255, 255, 255, 26))
        # 灯具点位
        for cx in range(160, W, 220):
            for cy in range(180, H - 260, 200):
                d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(255, 255, 255, 200))
    img = label_bar(img, title, subtitle, f"{space_type} · 示例图")
    path = os.path.join(OUT, name)
    img.save(path, "JPEG", quality=84, optimize=True)
    print(f"  {name}  {os.path.getsize(path)//1024} KB")

# 10 个案例的标题（与 seed/cases.json 顺序一致）
CASES = [
    ("住宅", "住宅公区智能照明", "大堂 · 走廊 · 电梯厅 ｜ 320㎡"),
    ("办公", "写字楼大堂照明", "层高 4.2m · UGR<19 ｜ 180㎡"),
    ("教育", "中学教室照明改造", "课桌 300lx · 黑板 500lx ｜ 65㎡"),
    ("商业", "商场中庭照明", "挑高 12m · 投光+洗墙 ｜ 400㎡"),
    ("住宅", "别墅全屋智能照明", "Ra95 高显色 · 多场景联动 ｜ 380㎡"),
    ("商业", "酒店客房照明", "氛围/功能/阅读三层光 ｜ 28㎡"),
    ("道路", "市政道路照明", "双向四车道 · 杆距 30m"),
    ("工业", "厂房高棚照明", "9m 层高 · LED 替代金卤灯 ｜ 2500㎡"),
    ("景观", "广场夜景照明", "防溢散光 · 色温≤3000K ｜ 1200㎡"),
    ("医疗", "医院走廊照明", "低眩光 · 夜间值班模式 ｜ 420㎡"),
]

print("生成封面图：")
for i, (space_type, title, subtitle) in enumerate(CASES, start=1):
    make_cover(f"{i:02d}-cover.jpg", space_type, title, subtitle, seed=i)

print("生成画廊图（案例 1 / 4 / 9 各 2 张）：")
for i in (1, 4, 9):
    space_type, title, subtitle = CASES[i - 1]
    for j, suffix in enumerate(["plan", "detail"], start=1):
        make_cover(f"{i:02d}-g{j}.jpg", space_type, title, f"{subtitle} · 示意 {j}", seed=i * 10 + j, variant="gallery")

# 演示视频（6 秒光效动画），ffmpeg 可用时生成
FFMPEG = r"D:\modofiles\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe"
mp4 = os.path.join(OUT, "demo-lighting.mp4")
if os.path.exists(FFMPEG):
    cmd = [
        FFMPEG, "-y", "-f", "lavfi",
        "-i", "gradients=s=1280x720:d=6:c0=0xfff1e0:c1=0xffc79a:x0=0:y0=0:x1=1280:y1=720:speed=0.03",
        "-vf", "drawtext=fontfile='C\\:/Windows/Fonts/msyh.ttc':text='照明案例 · 演示视频':fontsize=52:fontcolor=0x1c1917:x=(w-text_w)/2:y=(h-text_h)/2-30,drawtext=fontfile='C\\:/Windows/Fonts/msyh.ttc':text='真实项目视频可直接替换本文件':fontsize=26:fontcolor=0x57534e:x=(w-text_w)/2:y=(h-text_h)/2+50",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-t", "6", mp4,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(mp4):
        print(f"生成视频 demo-lighting.mp4  {os.path.getsize(mp4)//1024} KB")
    else:
        print("ffmpeg 失败：", (r.stderr or "")[-300:])
else:
    print("未找到 ffmpeg，跳过视频")

print("完成 ->", OUT)
