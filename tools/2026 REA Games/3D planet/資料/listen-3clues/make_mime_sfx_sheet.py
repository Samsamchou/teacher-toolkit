# 默劇＋音效檢查圖：每支影片每 0.5 秒一格（16 格），音效開始的那一格加紅框、格子下面寫「1.2s 刷卡嗶」；
# 下方時間軸＝混好的聲音波形＋每個音效的區段。用法：python -I make_mime_sfx_sheet.py → mime-sfx-check-v2.png
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
IDS = [("station", "train station 火車站"), ("supermarket", "supermarket 超市"), ("library", "library 圖書館"), ("bookstore", "bookstore 書店")]
F = lambda s, b=True: ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc" if b else "C:/Windows/Fonts/msjh.ttc", s)
FW, FH, COLS, STEP = 220, 126, 8, 0.5
ROWH = 40 + 2 * (FH + 44) + 90
W = 20 + COLS * (FW + 6) + 20
sh = Image.new("RGB", (W, 70 + len(IDS) * ROWH), "white"); d = ImageDraw.Draw(sh)
d.text((20, 16), "Listen and Guess 默劇＋音效 mime-sfx-check-v2（每 0.5 秒一格；紅框＝音效開始；下方＝聲音波形與音效區段）", fill="black", font=F(26))
tmp = tempfile.mkdtemp()
COL = ["#e03131", "#1971c2", "#2f9e44", "#f08c00"]
for r, (k, name) in enumerate(IDS):
    y0 = 70 + r * ROWH
    v = os.path.join(HERE, f"{k}_mime_sfx.mp4")
    ev = json.load(open(os.path.join(HERE, "video", "sfx", k, "plan.json"), encoding="utf-8"))["events"]
    d.text((20, y0), name, fill="black", font=F(24))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", v, "-vf", f"fps=2,scale={FW}:{FH}", os.path.join(tmp, f"{k}_%02d.png")])
    starts = {}
    for j, e in enumerate(ev):
        starts.setdefault(int(round(e["start"] / STEP)), []).append((j, e))
    for i in range(16):
        x = 20 + (i % COLS) * (FW + 6); y = y0 + 36 + (i // COLS) * (FH + 44)
        p = os.path.join(tmp, f"{k}_{i + 1:02d}.png")
        if os.path.exists(p): sh.paste(Image.open(p).convert("RGB"), (x, y))
        d.text((x + 3, y + 2), f"{i * STEP:.1f}s", fill="white", font=F(14), stroke_width=2, stroke_fill="black")
        for n, (j, e) in enumerate(starts.get(i, [])):
            d.rectangle((x - 2, y - 2, x + FW + 2, y + FH + 2), outline=COL[j % 4], width=4)
            d.text((x, y + FH + 4 + n * 20), f"{e['start']:.1f}s {e['label']}", fill=COL[j % 4], font=F(15))
    # 時間軸：波形＋區段
    ty = y0 + 36 + 2 * (FH + 44) + 6; tw = COLS * (FW + 6) - 6
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vn", "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32)
    if len(a):
        dur = len(a) / 8000; nb = tw
        env = [np.abs(a[int(i * len(a) / nb):int((i + 1) * len(a) / nb)]).max(initial=0) for i in range(nb)]
        m = max(env) or 1
        for i, e in enumerate(env):
            h = int(e / m * 28); d.line((20 + i, ty + 30 - h, 20 + i, ty + 30 + h), fill="#868e96")
    for j, e in enumerate(ev):
        x1 = 20 + int(e["start"] / 8.0 * tw); x2 = 20 + int((e["start"] + e["len"]) / 8.0 * tw)
        d.rectangle((x1, ty + 64, x2, ty + 76), fill=COL[j % 4])
        d.line((x1, ty, x1, ty + 76), fill=COL[j % 4], width=2)
sh.save(os.path.join(HERE, "mime-sfx-check-v2.png"))
print("saved", sh.size)
