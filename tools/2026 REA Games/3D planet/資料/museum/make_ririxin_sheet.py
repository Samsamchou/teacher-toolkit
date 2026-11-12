# 日日新商店位置修正檢查圖 ririxin-location-v1.png（先跑 ARRIVALS=1 SHOP=日日新商店 --test 產生 test_shop_0.png）
import json, os
from PIL import Image, ImageDraw, ImageFont
GAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "godot-ershui-planet")
m = json.load(open(os.path.join(GAME, "data", "map.json"), encoding="utf-8"))
FZ = lambda n: ImageFont.truetype("C:/Windows/Fonts/msjhbd.ttc", n); FR = lambda n: ImageFont.truetype("C:/Windows/Fonts/msjh.ttc", n)
X0, X1, Z0, Z1 = 5, 65, -122, -75; S = 14
w, h = int((X1 - X0) * S), int((Z1 - Z0) * S)
im = Image.new("RGB", (w, h), (246, 244, 236)); d = ImageDraw.Draw(im); T = lambda q: ((q[0] - X0) * S, (q[1] - Z0) * S)
for e in m["edges"]:
    a, b = m["nodes"][e[0]], m["nodes"][e[1]]; d.line([T(a), T(b)], fill=(160, 160, 160), width=max(2, int(e[2] * S)))
for r in m["rails"]: d.line([T(q) for q in r], fill=(60, 60, 60), width=2)
new = old = None
cen = lambda b: (sum(q[0] for q in b["poly"]) / len(b["poly"]), sum(q[1] for q in b["poly"]) / len(b["poly"]))
for b in m["buildings"]:
    sh = b.get("shop"); col = (240, 170, 90) if sh else (205, 170, 140)
    if str(b["id"]) == "497078920": col = (200, 200, 200); old = b
    if sh and sh["name"] == "日日新商店": col = (220, 40, 40); new = b
    d.polygon([T(q) for q in b["poly"]], fill=col, outline=(110, 80, 60))
    if sh and sh["name"] in ("四神湯", "火雞肉飯"): d.text(T(cen(b)), sh["name"], fill="black", font=FR(16))
P = {p["id"]: p for p in m["places"]}
for pid, txt, col in [("station", "二水車站", "#2050c0"), ("ok", "便利商店（光文路 9）", "#207040"), ("asia_inn", "亞洲旅社", "#805000")]:
    x, z = P[pid]["pos"]; s = P[pid].get("size") or 6
    d.rectangle([T((x - s / 2, z - s / 2)), T((x + s / 2, z + s / 2))], outline=col, width=3); d.text(T((x - s / 2, z + s / 2 + 0.3)), txt, fill=col, font=FZ(18))
co, cn = cen(old), cen(new)
d.line([T(co), T(cn)], fill=(220, 40, 40), width=4)
d.text((T(co)[0] + 8, T(co)[1] - 10), "舊位置（門牌內插，路的另一側）", fill=(110, 110, 110), font=FZ(18))
d.text((T(cn)[0] - 170, T(cn)[1] + 6), "新：日日新商店", fill=(220, 40, 40), font=FZ(20))
gx, gz = 34.04, -95.35; d.ellipse([T((gx - .4, gz - .4)), T((gx + .4, gz + .4))], outline="magenta", width=3)
shot = Image.open(os.path.join(GAME, "test_shop_0.png")).convert("RGB").resize((w, int(w * 9 / 16)))
sheet = Image.new("RGB", (w, 110 + h + shot.height + 50), "white"); D = ImageDraw.Draw(sheet)
D.text((10, 10), "日日新商店 位置修正 ririxin-location-v1（2026-11-12）", fill="black", font=FZ(28))
D.text((10, 50), "Google 地圖：惠民路 251 號 RJ79+46（23.8128681, 120.6181077，標永久歇業）", fill=(60, 60, 60), font=FR(17))
D.text((10, 76), "紫圈＝Google 點；紅＝新店屋（中心差 1.6 m），和便利商店同一側；灰＝舊位置那棟（現在沒有店名）", fill=(60, 60, 60), font=FR(17))
sheet.paste(im, (0, 110)); sheet.paste(shot, (0, 110 + h + 10))
D.text((10, 110 + h + shot.height + 14), "遊戲畫面：從惠民路看日日新商店正面（左邊是四神湯）", fill=(60, 60, 60), font=FR(20))
sheet.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ririxin-location-v1.png"))
