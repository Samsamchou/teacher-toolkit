"""[1112] 圳寶機車停車點檢查圖：Q2、Q5、Q9、Q11 每題一列。
左：地圖（data/map.json 照遊戲的畫法：柏油、人行道、圳溝、公園）＋機車在地上的範圍（21 個點）：等人 wait、上車 mount、騎到 arrive、停好 park；
右：出題時從機車正上方往下看的截圖（ANSWERZONE=1 SHEET=1 --test 拍的 SC_A_qNN_wait.png）。
用法：python -I tools/scooter_park_sheet.py <scooter_park_A.jsonl> <截圖資料夾> <輸出 png>
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

JL, SHOTDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
MAP = json.load(open(os.path.join(HERE, "..", "data", "map.json"), encoding="utf-8"))
WALK_W = 1.0
evs = {}
for line in open(JL, encoding="utf-8"):
    line = line.strip()
    if line:
        for e in json.loads(line):
            evs.setdefault(int(e["q"]), {})[e["phase"]] = e   # 同一題同一階段取最後一筆


def font(sz):
    for f in ["C:/Windows/Fonts/msjhbd.ttc", "C:/Windows/Fonts/msjh.ttc"]:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


F1, F2, F3 = font(28), font(19), font(16)
PH = [("wait", "等人（出題）", (255, 0, 160)), ("mount", "上車", (255, 140, 0)), ("arrive", "騎到", (0, 120, 255)), ("park", "停好", (0, 170, 0))]
MW, MH, SW, SH, PAD = 400, 400, 560, 315, 14
qs = [2, 5, 9, 11]
W = PAD * 4 + MW * 2 + SW
H = 70 + len(qs) * (MH + 50) + 50
img = Image.new("RGB", (W, H), (250, 247, 240))
d = ImageDraw.Draw(img)
d.text((PAD, 12), "圳寶機車停車點檢查 v1（2026-11-12）：機車整台（21 點）都要在柏油上，不在圳溝、草地、人行道", font=F1, fill=(40, 30, 50))
allok = True
N = MAP["nodes"]
nw = {}
for e in MAP["edges"]:
    nw[e[0]] = max(nw.get(e[0], 0), e[2]); nw[e[1]] = max(nw.get(e[1], 0), e[2])


def draw_map(E, keys, title):
    pts = [p for k in keys if k in E for p in E[k].get("foot", [])] or [[0, 0]]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    span = max(14.0, max(max(abs(p[0] - cx), abs(p[1] - cy)) for p in pts) * 2 + 6)
    k = MW / span
    T = lambda p: (MW / 2 + (p[0] - cx) * k, MH / 2 + (p[1] - cy) * k)
    m = Image.new("RGB", (MW, MH), (205, 214, 168))
    md = ImageDraw.Draw(m)
    for g in MAP["green"]:
        md.polygon([T(p) for p in g["poly"]], fill=(128, 189, 102) if g["kind"] != "farmland" else (148, 194, 102))
    for wv in MAP["water"]:
        for a, b in zip(wv["pts"], wv["pts"][1:]):
            md.line([T(a), T(b)], fill=(158, 158, 153), width=max(1, int((wv["w"] + 0.8) * k)))
            md.line([T(a), T(b)], fill=(115, 173, 214), width=max(1, int(wv["w"] * k)))
    for e in MAP["edges"]:
        md.line([T(N[e[0]]), T(N[e[1]])], fill=(219, 204, 184), width=max(1, int((e[2] + 2 * WALK_W) * k)))
    for n, wd in nw.items():
        x, y = T(N[n]); r = (wd / 2 + WALK_W) * k
        md.ellipse([x - r, y - r, x + r, y + r], fill=(219, 204, 184))
    for e in MAP["edges"]:
        md.line([T(N[e[0]]), T(N[e[1]])], fill=(107, 110, 120), width=max(1, int(e[2] * k)))
    for n, wd in nw.items():
        x, y = T(N[n]); r = (wd / 2 + 0.1) * k
        md.ellipse([x - r, y - r, x + r, y + r], fill=(107, 110, 120))
    for key, zh, col in PH:
        e = E.get(key)
        if not e or key not in keys:
            continue
        for p in e.get("foot", []):
            x, y = T(p)
            md.ellipse([x - 3, y - 3, x + 3, y + 3], fill=col if e["ok"] else (255, 0, 0), outline=(0, 0, 0))
        f = e.get("foot", [])
        if f:
            x, y = T(f[-2])
            md.text((x + 6, y - 10), zh, font=F2, fill=col, stroke_width=2, stroke_fill=(255, 255, 255))
    md.line([MW - 20 - 5 * k, MH - 18, MW - 20, MH - 18], fill=(0, 0, 0), width=3)
    md.text((MW - 20 - 5 * k, MH - 42), "5 m", font=F3, fill=(0, 0, 0))
    md.text((8, 6), title, font=F2, fill=(40, 30, 50), stroke_width=2, stroke_fill=(255, 255, 255))
    return m


for qi, q in enumerate(qs):
    y0 = 70 + qi * (MH + 50)
    E = evs.get(q, {})
    img.paste(draw_map(E, ["wait", "mount"], "出發：等人／上車"), (PAD, y0))
    img.paste(draw_map(E, ["arrive", "park"], "到達：騎到／停好"), (PAD * 2 + MW, y0))
    sp = os.path.join(SHOTDIR, "SC_A_q%02d_wait.png" % q)
    if os.path.exists(sp):
        img.paste(Image.open(sp).convert("RGB").resize((SW, SH)), (PAD * 3 + MW * 2, y0))
    lines = []
    for key, zh, col in PH:
        e = E.get(key)
        if e:
            allok = allok and e["ok"]
            lines.append("%s %s：在柏油上 %d/21 點、最低路面 %.3f m、碰到圳溝 %d 點" % ("OK" if e["ok"] else "NG", zh, 21 - e["bad"], e["min_h"], e["water"]))
        elif key in ("wait", "mount", "arrive"):
            allok = False
            lines.append("NG %s：沒有記錄" % zh)
    act = {2: "上網（學校→家，進門）", 5: "看電視（圖書館→家，進門）", 9: "籃球（家→草坪）", 11: "露營（草坪→水公園草地）"}[q]
    d.text((PAD, y0 + MH + 6), "Q%d %s" % (q, act), font=F2, fill=(90, 60, 140))
    d.text((PAD * 3 + MW * 2, y0 + SH + 6), "\n".join(lines), font=F3, fill=(0, 110, 0) if all(l.startswith("OK") for l in lines) else (200, 0, 0))
d.text((PAD, H - 40), "地圖：深灰＝柏油（路面高度 0.1）淺米＝人行道 藍＝圳溝 綠＝公園；點＝機車在地上的範圍（前後輪外緣 × 左右 0.32 m），紅點＝不在柏油上。"
       "全部 %s" % ("通過" if allok else "有問題"), font=F3, fill=(40, 30, 50))
img.save(OUT)
print("saved", OUT, "ALL OK" if allok else "NOT OK")
