# 把"在售清单"从整页文本改成"一行一个文本块"，提升参数类问题的召回
# 输出 data/extracted/在售清单_逐行切分（自动生成）.json
# 每个块形如：【双色筒射灯·月II系列】物料代码:541013711700 | 产品描述:... | 功率:7W | 光束角:15°-36° | 色温:2700-5700K | 显指:Ra95 | 是否在售:在售
import json
import os
from openpyxl import load_workbook

SRC = r"D:\deepseek work\data\待导入\原始文件\在售清单_欧普家用智能照明在售清单-（共享清单）-26年10月 (1).xlsx"
OUT_DIR = r"D:\deepseek work\data\extracted"
os.makedirs(OUT_DIR, exist_ok=True)

KEY_COLS = ["产品系列", "产品描述", "物料代码", "物料编码", "功率", "光束角", "色温", "显指", "光效", "开孔尺寸", "产品尺寸", "协议", "米家联动", "质保", "是否在售"]
SKIP_COLS = {"序号", "产品图片", "产品类型", "LED灯珠密度", "最小裁剪单位", "输入电压", "箱支"}


def norm(s: str) -> str:
    """列名归一化：去掉括号/空格/大小写差异，方便模糊匹配（显指(Ra) ≈ 显指（Ra)）"""
    s = str(s).lower()
    for ch in "（）()[]【】、,，.。-_/ ":
        s = s.replace(ch, "")
    return s

wb = load_workbook(SRC, data_only=True, read_only=True)
pages = []
page_no = 0
row_total = 0

for ws in wb.worksheets:
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        continue
    hdr_idx = None
    header = None
    for i, r in enumerate(rows[:6]):
        if not r:
            continue
        cells = [str(x).strip() if x is not None else "" for x in r]
        if any(c in ("物料代码", "物料编码") for c in cells) or (cells.count("产品系列") and "功率" in "".join(cells)):
            hdr_idx = i
            header = cells
            break
    if hdr_idx is None or header is None:
        continue
    page_no += 1
    col = {name: j for j, name in enumerate(header) if name}
    # 归一化后的列索引，用于模糊匹配表头
    norm_col = {norm(name): j for j, name in enumerate(header) if name}
    # 表格上方的品类标题（如 "SDL-吸顶灯/装饰灯"、"T02开关"），拼到每个行块里，
    # 这样问"吸顶灯"也能召回这些行（行本身只有系列名，没有品类词）
    sheet_title = ""
    for r0 in rows[:hdr_idx]:
        if not r0:
            continue
        cells0 = [str(x).strip() for x in r0 if x is not None and str(x).strip()]
        if cells0:
            sheet_title = cells0[0][:40]
            break

    def find_col(key):
        if key in col:
            return col[key]
        for nk, j in norm_col.items():
            if nk.startswith(norm(key)):
                return j
        return None

    for r in rows[hdr_idx + 1 :]:
        if not r:
            continue
        vals = [str(x).strip() if x is not None else "" for x in r]
        if not any(vals):
            continue
        series = ""
        for name in ("产品系列", "产品类型"):
            j = find_col(name)
            if j is not None and j < len(vals) and vals[j]:
                series = vals[j]
                break
        parts = []
        for name in KEY_COLS:
            j = find_col(name)
            if j is None or j >= len(vals) or not vals[j]:
                continue
            label = "显指" if name == "显指" else name
            parts.append(f"{label}:{vals[j]}")
        if not parts:
            continue
        text = (
            f"【{ws.title}" + (f"·{series}" if series else "") + "】"
            + (f"品类:{sheet_title} | " if sheet_title and sheet_title != ws.title else "")
            + " | ".join(parts)
        )
        pages.append({"page": page_no, "slide_title": ws.title, "text": text})
        row_total += 1

doc = {
    "source": "在售清单_逐行切分（自动生成）.json",
    "type": "xlsx",
    "pages": pages,
    "totalChars": sum(len(p["text"]) for p in pages),
    "emptyPages": 0,
}
out = os.path.join(OUT_DIR, "在售清单_逐行切分（自动生成）.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=1)

print(f"生成 {row_total} 个产品行块，覆盖 {page_no} 张表 -> {out}")
print("示例：", pages[0]["text"][:150] if pages else "无")
