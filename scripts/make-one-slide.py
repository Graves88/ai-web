# 一页 PPT（蓝色精简版 + 真实截图）
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

OUT = r"D:\deepseek work\export\项目汇报-照明案例库一页版.pptx"
SHOTS = r"D:\deepseek work\export\shots\crop"

# 蓝色系
BG = RGBColor(0xF6, 0xF8, 0xFC)
INK = RGBColor(0x1B, 0x25, 0x37)
MUTED = RGBColor(0x5B, 0x6B, 0x85)
BLUE = RGBColor(0x1E, 0x4F, 0xD8)
BLUE_DARK = RGBColor(0x16, 0x3C, 0xA6)
TINT = RGBColor(0xEA, 0xF1, 0xFE)
LINE = RGBColor(0xD6, 0xE2, 0xFA)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
slide = prs.slides.add_slide(prs.slide_layouts[6])

bg = slide.shapes.add_shape(1, 0, 0, prs.slide_width, prs.slide_height)
bg.fill.solid()
bg.fill.fore_color.rgb = BG
bg.line.fill.background()


def txt(x, y, w, h, s, size=12, bold=False, color=INK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = align
    r = p.add_run()
    r.text = s
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    r.font.name = "微软雅黑"
    return box


def rect(x, y, w, h, fill, line=None, radius=True):
    shp = slide.shapes.add_shape(1, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.75)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def circle_num(x, y, d, num):
    c = slide.shapes.add_shape(9, Inches(x), Inches(y), Inches(d), Inches(d))
    c.fill.solid()
    c.fill.fore_color.rgb = BLUE
    c.line.fill.background()
    c.shadow.inherit = False
    tf = c.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = num
    r.font.size = Pt(15)
    r.font.bold = True
    r.font.color.rgb = WHITE
    r.font.name = "微软雅黑"


def shot(path, x, y, w):
    pic = slide.shapes.add_picture(path, Inches(x), Inches(y), width=Inches(w))
    pic.line.color.rgb = LINE
    pic.line.width = Pt(0.75)
    return pic


# ===== 标题 =====
rect(0.55, 0.5, 0.1, 0.78, BLUE)
txt(0.8, 0.48, 8.2, 0.55, "照明案例库 + 产品资料 AI 问答", size=27, bold=True, color=INK)
txt(0.8, 1.02, 8.0, 0.3, "一个链接：看项目、查资料、问参数", size=13, color=MUTED)
txt(9.9, 0.52, 2.9, 0.3, "内部汇报 · 2026.11", size=10, color=MUTED, align=PP_ALIGN.RIGHT)

# ===== 左侧：怎么用 + 功能 =====
txt(0.55, 1.62, 3.6, 0.3, "怎么用 · 三步", size=14.5, bold=True, color=BLUE)

steps = [
    ("1", "打开链接", "手机 / 电脑，免安装"),
    ("2", "选案例", "看图、看视频、看参数"),
    ("3", "问资料", "答案带页码，可跳原文"),
]
y = 2.08
for num, title, sub in steps:
    circle_num(0.55, y, 0.38, num)
    txt(1.08, y - 0.02, 2.9, 0.28, title, size=14.5, bold=True)
    txt(1.08, y + 0.28, 3.0, 0.26, sub, size=10.5, color=MUTED)
    y += 0.86

txt(0.55, 4.72, 3.6, 0.3, "业务功能", size=14.5, bold=True, color=BLUE)
chips = ["案例浏览", "现场照片", "视频回看", "资料下载", "型号搜索", "AI 问答"]
cw, ch = 1.58, 0.4
for i, c in enumerate(chips):
    col, row = i % 2, i // 2
    x = 0.55 + col * (cw + 0.12)
    yy = 5.12 + row * (ch + 0.09)
    rect(x, yy, cw, ch, TINT, TINT)
    txt(x, yy + 0.08, cw, 0.26, c, size=11, bold=True, color=BLUE_DARK, align=PP_ALIGN.CENTER)

txt(0.55, 6.62, 3.7, 0.26, "10 个项目 · 11 份资料 · 34 张现场照片", size=9.5, color=MUTED)
txt(0.55, 6.9, 3.7, 0.26, "零培训 · 经销商 / 销售 / 新人通用", size=9.5, color=MUTED)

# ===== 右侧：截图（主图 + 两张小图）=====
txt(4.35, 1.62, 8.4, 0.3, "界面实拍", size=14.5, bold=True, color=BLUE)

big = shot(os.path.join(SHOTS, "cases.png"), 4.35, 2.02, 5.35)
small_y = 2.02
a = shot(os.path.join(SHOTS, "ask.png"), 9.88, small_y, 2.92)
r = shot(os.path.join(SHOTS, "resources.png"), 9.88, small_y + a.height.inches + 0.14, 2.92)

# ===== 底部地址 =====
txt(11.0, 6.62, 1.8, 0.24, "www.chaole.top", size=10, bold=True, color=BLUE, align=PP_ALIGN.RIGHT)

prs.save(OUT)
print("已生成:", OUT, f"{os.path.getsize(OUT)//1024} KB")
