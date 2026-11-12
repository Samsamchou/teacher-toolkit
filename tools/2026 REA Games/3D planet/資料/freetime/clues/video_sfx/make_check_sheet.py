# Free Time 默劇＋音效檢查圖：11 支 × 每 0.5 秒一格；音效開始的那一格加色框、格子下寫秒數；
# 右邊＝每個音效「開始那一刻」的畫面（精確秒數）；下方＝混好的聲音波形＋每個音效的區段（多下的打擊聲畫小刻度）。
# 用法：python -I make_check_sheet.py → 資料/freetime/mime-sfx-check-v1.png
import json, os, subprocess, tempfile
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
OUTPNG = os.path.normpath(os.path.join(HERE, r"..\..\mime-sfx-check-v1.png"))
VID = os.path.normpath(os.path.join(HERE, r"..\..\..\..\godot-ershui-freetime\assets\clues\video"))
SFX = os.path.normpath(os.path.join(HERE, r"..\..\..\..\godot-ershui-freetime\assets\clues\video_sfx"))
IDS = [("baseball", "play baseball 棒球"), ("basketball", "play basketball 籃球"), ("bike", "ride a bike 騎腳踏車"),
       ("camping", "go camping 露營"), ("english", "study English 讀英文"), ("games", "play online games 線上遊戲"),
       ("internet", "surf the Internet 上網"), ("jogging", "go jogging 慢跑"), ("music", "listen to music 聽音樂"),
       ("recorder", "play the recorder 吹直笛"), ("tv", "watch TV 看電視")]
F = lambda s, b=True: ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc" if b else "C:/Windows/Fonts/msjh.ttc", s)
FW, FH, COLS, STEP, DUR = 144, 81, 12, 0.5, 6.04
EW, EH = 192, 108
ROWH = 34 + FH + 22 + 64 + 14
LW = COLS * (FW + 4)
W = 20 + LW + 16 + 2 * (EW + 8) + 10
COL = ["#e03131", "#1971c2"]
sh = Image.new("RGB", (W, 96 + len(IDS) * ROWH), "white"); d = ImageDraw.Draw(sh)
d.text((20, 12), "Free Time 默劇＋音效 mime-sfx-check-v1（每 0.5 秒一格；色框＝音效開始；右邊＝音效開始那一刻；下方＝聲音波形與音效區段）", fill="black", font=F(24))
d.text((20, 52), "聲音：KIE Sounds，每支 1–2 個關鍵聲、沒有說話聲；整段 -20 LUFS（比「聽聲音」線索小聲）；遊戲裡影片第一格出來才開始播、跟著影片位置；兩人錄音時停。", fill="#495057", font=F(17, False))
tmp = tempfile.mkdtemp()


def frame_at(k, t, w, h):
    p = os.path.join(tmp, f"{k}_{t:.2f}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", os.path.join(VID, k + ".ogv"), "-frames:v", "1", "-vf", f"scale={w}:{h}", p])
    return Image.open(p).convert("RGB") if os.path.exists(p) else Image.new("RGB", (w, h), "gray")


for r, (k, name) in enumerate(IDS):
    y0 = 96 + r * ROWH
    ev = json.load(open(os.path.join(HERE, "plan", k + ".json"), encoding="utf-8"))["events"]
    d.line((10, y0 - 6, W - 10, y0 - 6), fill="#dee2e6", width=2)
    d.text((20, y0), name, fill="black", font=F(20))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(VID, k + ".ogv"), "-vf", f"fps=2,scale={FW}:{FH}", os.path.join(tmp, f"{k}_%02d.png")])
    fy = y0 + 30
    for i in range(COLS):
        x = 20 + i * (FW + 4)
        p = os.path.join(tmp, f"{k}_{i + 1:02d}.png")
        if os.path.exists(p): sh.paste(Image.open(p).convert("RGB"), (x, fy))
        d.text((x + 3, fy + 2), f"{i * STEP:.1f}s", fill="white", font=F(13), stroke_width=2, stroke_fill="black")
    for j, e in enumerate(ev):
        for n, t in enumerate(e.get("hits", [e["start"]])):
            i = min(COLS - 1, int(round(t / STEP)))
            x = 20 + i * (FW + 4)
            d.rectangle((x - 2, fy - 2, x + FW + 1, fy + FH + 1), outline=COL[j % 2], width=3)
    # 標籤列
    d.text((20, fy + FH + 3), "   ".join(f"● {e['start']:.2f}s {e['label']}" + (f"（{', '.join(f'{h:.2f}' for h in e['hits'])}）" if e.get("hits") else "") for e in ev),
           fill="black", font=F(14))
    for j, e in enumerate(ev):   # 圓點顏色
        pass
    # 波形（0–DUR 秒）
    ty = fy + FH + 22
    a, sr = sf.read(os.path.join(SFX, k + ".ogg"), dtype="float32")
    if a.ndim > 1: a = a.mean(axis=1)
    px = lambda t: 20 + int(t / DUR * LW)
    d.rectangle((20, ty, 20 + LW, ty + 48), fill="#f8f9fa")
    nb = LW; m = np.abs(a).max() or 1
    for i in range(nb):
        s0, s1 = int(i / nb * DUR * sr), int((i + 1) / nb * DUR * sr)
        e_ = np.abs(a[s0:s1]).max(initial=0) / m
        h = int(e_ * 22); d.line((20 + i, ty + 24 - h, 20 + i, ty + 24 + h), fill="#495057")
    for s in range(7):
        d.line((px(s), ty + 44, px(s), ty + 48), fill="black"); d.text((px(s) + 2, ty + 34), f"{s}s", fill="#868e96", font=F(11, False))
    for j, e in enumerate(ev):
        c = COL[j % 2]
        d.rectangle((px(e["start"]), ty + 50, px(e["start"] + e["len"]), ty + 58), fill=c)
        for t in e.get("hits", [e["start"]]):
            d.line((px(t), ty - 2, px(t), ty + 58), fill=c, width=2)
    # 右邊：每個事件開始那一刻
    ex0 = 20 + LW + 16
    for j, e in enumerate(ev[:2]):
        ex = ex0 + j * (EW + 8)
        sh.paste(frame_at(k, e["start"], EW, EH), (ex, fy))
        d.rectangle((ex - 2, fy - 2, ex + EW + 1, fy + EH + 1), outline=COL[j % 2], width=3)
        d.text((ex + 3, fy + 2), f"{e['start']:.2f}s", fill="white", font=F(14), stroke_width=2, stroke_fill="black")
        d.text((ex, fy + EH + 4), e["label"][:14], fill=COL[j % 2], font=F(14))
sh.save(OUTPNG)
print("saved", OUTPNG, sh.size)
