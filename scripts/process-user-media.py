# 处理用户自己放进 public/demo/cases 的文件：
# - 4K 竖屏 114 秒视频 → 720p / 8MB 以内（H.264 + AAC），并修正文件名里的空格
# - 3 张 PNG → JPEG（长边 1600、q82）
# - 案例 1 重命名为 01-1.jpg / 01-2.jpg / 01-3.jpg
import os, subprocess, glob
from PIL import Image, ImageOps

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "demo", "cases")
FFMPEG = r"D:\modofiles\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe"

# 1) 图片：png -> jpg
pngs = sorted(glob.glob(os.path.join(OUT, "*.png")))
name_map = {"01-cover.png": "01-1.jpg", "01-g1.png": "01-2.jpg", "01-g2.png": "01-3.jpg"}
for p in pngs:
    base = os.path.basename(p)
    target = name_map.get(base, base.replace(".png", ".jpg"))
    img = Image.open(p).convert("RGB")
    w, h = img.size
    s = 1600 / max(w, h)
    if s < 1:
        img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
    path = os.path.join(OUT, target)
    img.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"  图片 {base} -> {target}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path)//1024} KB")
    os.remove(p)

# 2) 视频：压缩 + 改名
src = os.path.join(OUT, "demo-lighting .mp4")
dst = os.path.join(OUT, "demo-lighting.mp4")
if not os.path.exists(src):
    # 兼容没有空格的情况
    alt = os.path.join(OUT, "demo-lighting.mp4")
    if os.path.exists(alt) and os.path.getsize(alt) > 20 * 1024 * 1024:
        src = alt
if os.path.exists(src) and os.path.getsize(src) > 20 * 1024 * 1024:
    cmd = [
        FFMPEG, "-y", "-i", src,
        "-vf", "scale=720:-2:flags=lanczos",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "27",
        "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart",
        dst,
    ]
    print("  正在压缩视频（114s 4K -> 720p）…")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0 and os.path.exists(dst):
        print(f"  视频 -> demo-lighting.mp4  {os.path.getsize(dst)/1024/1024:.1f} MB")
        if src != dst:
            os.remove(src)
    else:
        print("  ffmpeg 失败：", (r.stderr or "")[-400:])
else:
    print("  没有需要压缩的大视频")

print("\n当前目录：")
for f in sorted(os.listdir(OUT)):
    print(f"  {f}  {os.path.getsize(os.path.join(OUT, f))//1024} KB")
