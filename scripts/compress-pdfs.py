# 压缩体积过大的 PDF：把每页渲染成图片再重新打包（照片型幻灯片的 PDF 通常能压到 1/5-1/10）
# 只处理 >15MB 的 PDF，原文件备份到 pdf-original/
import os, glob, shutil, subprocess
from PIL import Image

NODE = r"D:\Program Files (x86)T\DeepSeeek\resources\runtime\primary-runtime\dependencies\node\bin\node.exe"
CLI = r"D:\Program Files (x86)T\DeepSeeek\resources\app.asar.unpacked\dsh\node_modules\@deepseek-ai\libreoffice-kit\lib\cli.js"
PDF_DIR = r"D:\deepseek work\data\待导入\pdf"
BACKUP = r"D:\deepseek work\data\待导入\pdf-original"
TMP = r"D:\deepseek work\data\待导入\_render"
MAX_EDGE = 1600
QUALITY = 78
THRESHOLD_MB = 15

os.makedirs(BACKUP, exist_ok=True)


def safe(s: str) -> str:
    """控制台是 GBK，去除非 GBK 字符，避免打印崩掉"""
    return s.encode("gbk", errors="replace").decode("gbk")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    return r.returncode, (r.stdout or b"").decode("utf-8", "replace"), (r.stderr or b"").decode("utf-8", "replace")


for pdf in sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf"))):
    name = os.path.basename(pdf)
    size_mb = os.path.getsize(pdf) / 1024 / 1024
    if size_mb <= THRESHOLD_MB:
        print(f"跳过（{size_mb:.1f}MB）：{safe(name)}")
        continue

    print(f"压缩：{safe(name)}（{size_mb:.1f}MB）…", flush=True)
    if os.path.exists(TMP):
        shutil.rmtree(TMP, ignore_errors=True)
    # 注意：CLI 要求 output-dir 不存在，它自己创建

    code, out, err = run(
        [NODE, CLI, "render", "--input", pdf, "--output-dir", TMP, "--dpi", "110", "--max-input-bytes", "500000000"]
    )
    pngs = sorted(glob.glob(os.path.join(TMP, "*.png")))
    if not pngs:
        print(f"  渲染失败：{safe((err or out)[-300:])}")
        continue

    pages = []
    for p in pngs:
        img = Image.open(p).convert("RGB")
        w, h = img.size
        s = MAX_EDGE / max(w, h)
        if s < 1:
            img = img.resize((round(w * s), round(h * s)), Image.LANCZOS)
        pages.append(img)

    out_tmp = pdf + ".compressed.pdf"
    pages[0].save(out_tmp, "PDF", save_all=True, append_images=pages[1:], resolution=110.0)
    shutil.copy2(pdf, os.path.join(BACKUP, name))
    os.replace(out_tmp, pdf)
    shutil.rmtree(TMP, ignore_errors=True)
    print(f"  {len(pages)} 页  {size_mb:.1f}MB -> {os.path.getsize(pdf) / 1024 / 1024:.1f}MB", flush=True)

print("\n最终体积：")
total = 0
for pdf in sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf"))):
    mb = os.path.getsize(pdf) / 1024 / 1024
    total += mb
    print(f"  {safe(os.path.basename(pdf))}  {mb:.1f}MB")
print(f"合计 {total:.1f}MB")
