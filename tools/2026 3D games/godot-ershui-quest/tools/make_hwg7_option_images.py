"""HWG7 R1 聽力第 4–8 題的選項插圖：AI 生的底圖＋程式疊上數字（AI 常把數字畫錯）。

用法：python -I tools/make_hwg7_option_images.py
讀 generated-images/20261022/hwg7-listening/*.png，輸出到同資料夾的 options/：
- 第 4 題 boy-bus／boy-mrt／boy-train、第 8 題 girl-bike／girl-car／girl-walk：直接複製
- 第 5 題 tower-348／347／248：在測量箭頭旁的空白標籤寫「348 m」等
- 第 6 題 card-<電話>：在名片空白處寫電話號碼
- 第 7 題 door-472／372／473：在門牌上寫房號
標籤位置（BOX）依實際底圖量出來，換底圖要重新量。
"""
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\generated-images\20261022\hwg7-listening")
OUT = SRC / "options"
FONT = r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\godot-ershui-quest\assets\fonts\ComicRelief-Bold.ttf"

# 底圖上要寫字的方框 (x0, y0, x1, y1)；fill=None 表示保留底圖顏色、只寫字
BOX = {
    "tower": (722, 444, 929, 536),   # 測量箭頭旁的白色標籤（量到 713,436–938,544）
    "card": (320, 383, 740, 473),    # 名片上電話圖示右邊的空白；名片逆時針斜約 5.8°（四角 118,287／780,220／798,601／159,664）
    "door": (458, 272, 578, 326),    # 金色門牌（量到 445,261–591,337）
}
ANGLE = {"card": 5.8}
LABELS = {
    "tower": ["348 m", "347 m", "248 m"],
    "card": ["0919234557", "0910234557", "0919234556"],
    "door": ["472", "372", "473"],
}
INK = {"tower": (31, 42, 90), "card": (31, 42, 90), "door": (60, 40, 10)}


def fit_text(draw, text, box):
    x0, y0, x1, y1 = box
    size = int((y1 - y0) * 0.8)
    while size > 10:
        f = ImageFont.truetype(FONT, size)
        l, t, r, b = draw.textbbox((0, 0), text, font=f)
        if r - l <= (x1 - x0) * 0.92 and b - t <= (y1 - y0) * 0.8:
            return f, (x0 + (x1 - x0 - (r - l)) / 2 - l, y0 + (y1 - y0 - (b - t)) / 2 - t)
        size -= 2
    raise SystemExit(f"字放不進方框：{text}")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for n in ["boy-bus", "boy-mrt", "boy-train", "girl-bike", "girl-car", "girl-walk"]:
        shutil.copyfile(SRC / f"{n}.png", OUT / f"{n}.png")
    for base, labels in LABELS.items():
        box = BOX[base]
        if box[2] <= box[0]:
            raise SystemExit(f"{base} 的 BOX 還沒量")
        for text in labels:
            im = Image.open(SRC / f"{base}.png").convert("RGBA")
            if base in ANGLE:
                # 斜放的名片：在透明圖層上寫字、旋轉成名片的角度，再貼回去
                layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
                d = ImageDraw.Draw(layer)
                f, xy = fit_text(d, text, box)
                d.text(xy, text, font=f, fill=INK[base] + (255,))
                cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
                layer = layer.rotate(ANGLE[base], center=(cx, cy), resample=Image.BICUBIC)
                im.alpha_composite(layer)
            else:
                d = ImageDraw.Draw(im)
                f, xy = fit_text(d, text, box)
                d.text(xy, text, font=f, fill=INK[base] + (255,))
            im = im.convert("RGB")
            name = f"{base}-{text.replace(' m', '')}.png"
            im.save(OUT / name)
            print(name)


if __name__ == "__main__":
    main()
