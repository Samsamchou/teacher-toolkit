"""Contact sheets: each attempt redrawn from strokes on the four-line grid,
with target, verdict and AI candidates. usage: python sheets.py data.json outdir"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

data = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
os.makedirs(out, exist_ok=True)
W, H, LAB = 400, 300, 64
font = ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", 15)
COLS = 4


def tile(t, idx):
    img = Image.new("RGB", (W, H + LAB), "white")
    d = ImageDraw.Draw(img)
    for y, c in ((0.08, "#999"), (0.37, "#bbb"), (0.68, "#36c"), (0.94, "#999")):
        d.line([(0, y * H), (W, y * H)], fill=c, width=1)
    d.line([(W / 2, 0), (W / 2, H)], fill="#eb3", width=1)
    for s in t.get("strokes") or []:
        pts = [(p["x"] * W, p["y"] * H) for p in s.get("points", [])]
        if len(pts) > 1:
            d.line(pts, fill="#123", width=4, joint="curve")
        elif pts:
            d.ellipse([pts[0][0] - 2, pts[0][1] - 2, pts[0][0] + 2, pts[0][1] + 2], fill="#123")
    det = (t.get("aiRawResult") or {}).get("detail") or {}

    def side(k):
        x = det.get(k) or {}
        c = ",".join(f"{c['glyph']}{c['probability']}" for c in (x.get("candidates") or [])[:3])
        g = x.get("geometry") or {}
        gi = "" if g.get("ok", True) else "格" + "/".join(str(i)[:14] for i in g.get("issues", []))
        sh = x.get("shape") or {}
        si = "" if sh.get("ok", True) else "斜" + str(sh.get("issue"))[:10]
        return f"{c} {gi}{si}"

    ok = t["passed"]
    d.rectangle([0, H, W, H + LAB], fill="#e7f7e7" if ok else "#fde4e4")
    d.text((4, H + 2), f"#{idx} {t['studentId']} 目標 {t['letter']}{t['letter'].lower()}  {'對' if ok else '錯'}", fill="black", font=font)
    d.text((4, H + 22), "左 " + side("left"), fill="black", font=font)
    d.text((4, H + 42), "右 " + side("right"), fill="black", font=font)
    return img


items = sorted(data, key=lambda t: (t["studentId"], t["timestampMillis"]))
json.dump([{"idx": i, "id": t["id"], "studentId": t["studentId"], "letter": t["letter"], "passed": t["passed"]} for i, t in enumerate(items)],
          open(os.path.join(out, "index.json"), "w", encoding="utf-8"), ensure_ascii=False)
per = 16
for page in range(0, len(items), per):
    chunk = items[page:page + per]
    rows = (len(chunk) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * (W + 6), rows * (H + LAB + 6)), "#555")
    for j, t in enumerate(chunk):
        sheet.paste(tile(t, page + j), ((j % COLS) * (W + 6), (j // COLS) * (H + LAB + 6)))
    sheet.save(os.path.join(out, f"sheet-{page // per + 1:02d}.png"))
print(len(items), "items")
