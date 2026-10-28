# 生成"对外版"在售清单：去掉机密声明，保留全部产品参数（原表本身不含价格列）
# 输出：data/待导入/pdf/在售清单_对外版.xlsx（随后由 LibreOffice 转 PDF 发布）
import os
from openpyxl import load_workbook

SRC = r"D:\deepseek work\data\待导入\原始文件\在售清单_欧普家用智能照明在售清单-（共享清单）-26年10月 (1).xlsx"
OUT_DIR = r"D:\deepseek work\data\待导入\pdf"
OUT = os.path.join(OUT_DIR, "在售清单_欧普家用智能照明在售清单-26年10月-对外版.xlsx")
os.makedirs(OUT_DIR, exist_ok=True)

wb = load_workbook(SRC)  # 保留格式，不用 data_only
ws = wb["总目录"]

removed = []
for row in ws.iter_rows():
    for cell in row:
        if cell.value and isinstance(cell.value, str) and ("机密" in cell.value or "禁止传递" in cell.value):
            removed.append((cell.coordinate, cell.value))
            cell.value = None

# 在目录下方加一行对外说明
note_cell = ws["A30"]
note_cell.value = "本清单为对外版（产品参数版，不含价格）；具体价格与政策请联系对接销售或经销商。"
note_cell.font = note_cell.font.copy(size=11)
note_cell.alignment = note_cell.alignment.copy(wrap_text=True)

wb.save(OUT)
print("已移除机密声明单元格:", [c for c, _ in removed])
for c, v in removed:
    print("  -", c, v[:60])
print("输出:", OUT)
