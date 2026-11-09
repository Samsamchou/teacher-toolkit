"""把 Codex 生成的 4×3 組別頭像表切成 12 張圓形 PNG（assets/ui/emoji_01.png …）。

來源：3D planet/資料/generated-images/emoji_sheet.png（Codex CLI 內建生圖，2026-10-25）
做法：每一格找出非白色像素的範圍 → 取正方形 → 圓形遮罩去白底 → 縮成 192×192。
用法：python -I tools/slice_emoji.py <emoji_sheet.png>
"""
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main() -> None:
    im = Image.open(sys.argv[1]).convert("RGB")
    W, H = im.size
    gray = im.convert("L")
    out = os.path.join(HERE, "assets", "ui")
    os.makedirs(out, exist_ok=True)
    ink = gray.point(lambda v: 1 if v < 235 else 0)
    px = ink.load()
    cols = [sum(px[x, y] for y in range(0, H, 2)) for x in range(W)]
    rows = [sum(px[x, y] for x in range(0, W, 2)) for y in range(H)]
    xs = _runs(cols, 4)
    ys = _runs(rows, 3)
    n = 0
    for (y0, y1) in ys:
        for (x0, x1) in xs:
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            half = max(x1 - x0, y1 - y0) / 2
            sq = im.crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half))).resize((384, 384), Image.LANCZOS)
            mask = Image.new("L", (384, 384), 0)
            ImageDraw.Draw(mask).ellipse((2, 2, 381, 381), fill=255)
            rgba = sq.convert("RGBA")
            rgba.putalpha(mask)
            n += 1
            rgba.resize((192, 192), Image.LANCZOS).save(os.path.join(out, f"emoji_{n:02d}.png"))
    print("saved", n, xs, ys)


def _runs(proj, count):
    """投影值 > 門檻的連續區段（白色間隙把各格分開），取最長的 count 段。"""
    thr = max(proj) * 0.05
    runs, start = [], None
    for i, v in enumerate(proj + [0]):
        if v > thr and start is None:
            start = i
        elif v <= thr and start is not None:
            runs.append((start, i))
            start = None
    runs = sorted(sorted(runs, key=lambda r: r[1] - r[0], reverse=True)[:count])
    return runs


if __name__ == "__main__":
    main()
