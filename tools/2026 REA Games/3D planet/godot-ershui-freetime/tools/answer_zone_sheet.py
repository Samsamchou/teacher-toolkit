"""[1112] 作答畫面遮擋檢查圖：水鈴、圳寶 × 分組 A／兩人一組 B × 11 題（作答那一格）。
每格畫出畫面上的框（分數牌、按鈕欄、題目面板、線索框、外框題目面板＝虛線）和吉祥物網格的包圍盒（綠＝0 重疊、紅＝有重疊），標重疊面積。
來源：ANSWERZONE=1 SHEET=1 --test 的 test_shots/<OUTTAG>/answerzone_<route>_<A|B>.json＋AZ_*.png
用法：python -I tools/answer_zone_sheet.py <test_shots 資料夾> <輸出 png>
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

SHOTS, OUT = sys.argv[1], sys.argv[2]
COLS = [("shuiling", "A", "az_shuiling_A"), ("shuiling", "B", "az_shuiling_B"), ("zunbo", "A", "az_zunbo_A"), ("zunbo", "B", "az_zunbo_B")]
NAME = {"shuiling": "水鈴 Shuiling", "zunbo": "圳寶 Zun-Bo"}
MODE = {"A": "分組 A（押注後）", "B": "兩人一組 B（作答中）"}
TW, TH = 400, 225
PAD, HEAD, LAB = 10, 70, 26
COLR = {"score chips": (255, 140, 0), "buttons": (0, 120, 255), "panel": (150, 60, 200), "clue": (230, 0, 160), "frame quiz": (0, 160, 160), "debug": (128, 128, 128)}


def font(sz):
    for f in ["C:/Windows/Fonts/msjhbd.ttc", "C:/Windows/Fonts/msjh.ttc", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


F1, F2, F3 = font(26), font(18), font(15)
rows = {}
for route, mode, tag in COLS:
    p = os.path.join(SHOTS, tag, "answerzone_%s_%s.json" % (route, mode))
    data = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []
    for r in data:
        rows.setdefault((route, mode, r["q"]), []).append(r)

W = PAD + len(COLS) * (TW + PAD)
H = HEAD + 11 * (TH + LAB + PAD) + 40
img = Image.new("RGB", (W, H), (250, 247, 240))
d = ImageDraw.Draw(img)
n_ok = n_all = 0
d.text((PAD, 8), "作答畫面遮擋檢查 v1（2026-11-12）：吉祥物網格包圍盒 vs 畫面上每個框，重疊面積要 0", font=F1, fill=(40, 30, 50))
for ci, (route, mode, tag) in enumerate(COLS):
    x0 = PAD + ci * (TW + PAD)
    d.text((x0, 42), "%s・%s" % (NAME[route], MODE[mode]), font=F2, fill=(90, 60, 140))
    for q in range(1, 12):
        y0 = HEAD + (q - 1) * (TH + LAB + PAD)
        rs = rows.get((route, mode, q), [])
        shot = next((r for r in rs if r.get("shot")), None)
        all_ok = all(r["ok"] for r in rs) and rs
        n_all += len(rs)
        n_ok += sum(1 for r in rs if r["ok"])
        if shot and os.path.exists(os.path.join(SHOTS, tag, shot["shot"] + ".png")):
            im = Image.open(os.path.join(SHOTS, tag, shot["shot"] + ".png")).convert("RGB")
            vw, vh = shot["vs"]
            sx, sy = TW / im.width, TH / im.height
            k = im.width / vw   # 截圖像素 / 可見範圍座標
            th = im.resize((TW, TH))
            dd = ImageDraw.Draw(th)
            for name, (rx, ry, rw, rh) in shot["rects"].items():
                c = COLR.get(name, (0, 0, 0))
                box = [rx * k * sx, ry * k * sy, (rx + rw) * k * sx, (ry + rh) * k * sy]
                if name == "frame quiz":   # 外框（網頁）的面板：Godot 截圖裡沒有，畫虛線＋淡色
                    ov = Image.new("RGBA", th.size, (0, 0, 0, 0))
                    ImageDraw.Draw(ov).rectangle(box, fill=(0, 160, 160, 60))
                    th = Image.alpha_composite(th.convert("RGBA"), ov).convert("RGB")
                    dd = ImageDraw.Draw(th)
                    for t in range(int(box[1]), int(box[3]), 8):
                        dd.line([box[0], t, box[0], t + 4], fill=c, width=2)
                    dd.line([box[0], box[1], box[2], box[1]], fill=c, width=2)
                else:
                    dd.rectangle(box, outline=c, width=2)
            bx, by, bw, bh = shot["box"]
            dd.rectangle([bx * k * sx, by * k * sy, (bx + bw) * k * sx, (by + bh) * k * sy], outline=(0, 200, 0) if shot["ok"] else (255, 0, 0), width=3)
            img.paste(th, (x0, y0))
        else:
            d.rectangle([x0, y0, x0 + TW, y0 + TH], outline=(200, 0, 0), width=2)
            d.text((x0 + 10, y0 + 10), "沒有截圖", font=F2, fill=(200, 0, 0))
        act = rs[0]["act"] if rs else "?"
        ph = "  ".join("%s %s%d" % (r["phase"], "OK " if r["ok"] else "NG ", int(r["overlap"])) for r in rs)
        d.text((x0, y0 + TH + 3), "Q%d %s  重疊px²: %s" % (q, act, ph), font=F3, fill=(0, 120, 0) if all_ok else (200, 0, 0))
d.text((PAD, H - 32), "框：橘＝分數牌 藍＝按鈕欄 紫＝題目面板 粉紅＝線索框 青色虛線＝外框題目面板（網頁）；綠框＝吉祥物（0 重疊）紅框＝有重疊。"
       "每格下面：locked＝出題鎖住、clue＝線索、answer／bets＝作答。合計 %d/%d 個畫面 0 重疊。" % (n_ok, n_all), font=F3, fill=(40, 30, 50))
img.save(OUT)
print("saved", OUT, "%d/%d ok" % (n_ok, n_all))
