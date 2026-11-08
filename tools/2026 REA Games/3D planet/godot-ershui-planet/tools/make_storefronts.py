"""程式畫的 2.5D 店面圖（老師 11/08 RDQ：街道兩旁建築用程式畫出 2.5D 效果）。

每種店一格 256×128（4 欄 × 8 列 → 1024×1024 圖集），畫「打開的店面」：
透視的天花板／地板／兩側牆＋後牆，前面是該店的招牌商品（茶罐、藥櫃、理髮椅、機車、麵攤…）。
遊戲裡貼在店家一樓（world.gd SHOP_KINDS 的順序＝格子編號）。
輸出：assets/textures/storefronts.png
用法：python -I tools/make_storefronts.py
"""
import math
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, "assets", "textures", "storefronts.png")
W, H = 256, 128
KINDS = ["general", "tealeaf", "drink", "breakfast", "snack", "noodle", "buffet", "pharmacy",
         "clinic", "hair", "scooter", "bike", "lottery", "agri", "rice", "herbal",
         "fruit", "convenience", "clock", "telecom", "claw", "craft", "shoes", "plain"]
INK = (52, 40, 48)


def room(d, wall, floor, ceil, side):
    """透視的店內：後牆在中間（x 40–216, y 26–100），四周往外斜。"""
    bx0, by0, bx1, by1 = 40, 26, 216, 100
    d.polygon([(0, 0), (W, 0), (bx1, by0), (bx0, by0)], fill=ceil)
    d.polygon([(0, H), (W, H), (bx1, by1), (bx0, by1)], fill=floor)
    d.polygon([(0, 0), (bx0, by0), (bx0, by1), (0, H)], fill=side)
    d.polygon([(W, 0), (bx1, by0), (bx1, by1), (W, H)], fill=tuple(max(0, c - 18) for c in side))
    d.rectangle([bx0, by0, bx1, by1], fill=wall)
    for x in range(bx0 + 20, bx1, 40):    # 天花板燈
        d.rectangle([x - 10, 8, x + 10, 12], fill=(255, 250, 220))
    for i in range(0, W, 32):             # 地磚線
        d.line([(i, H), (bx0 + (i / W) * (bx1 - bx0), by1)], fill=tuple(c - 14 for c in floor), width=1)
    return bx0, by0, bx1, by1


def shelf(d, x0, y0, x1, y1, rows, colors, item_w=8, gap=3, rnd=None):
    d.rectangle([x0, y0, x1, y1], fill=(150, 112, 80), outline=INK)
    h = (y1 - y0) / rows
    for r in range(rows):
        yb = y0 + (r + 1) * h - 2
        d.line([(x0, yb + 1), (x1, yb + 1)], fill=INK, width=2)
        x = x0 + 3
        while x + item_w < x1 - 2:
            c = colors[(rnd.randrange(len(colors)))]
            ih = int(h * rnd.uniform(0.5, 0.85))
            d.rectangle([x, yb - ih, x + item_w, yb], fill=c, outline=INK)
            x += item_w + gap


def counter(d, x0, y0, x1, y1, col):
    d.rectangle([x0, y0, x1, y1], fill=col, outline=INK, width=2)
    d.rectangle([x0 - 3, y0 - 5, x1 + 3, y0], fill=tuple(min(255, c + 25) for c in col), outline=INK)


def person(d, x, y, shirt, rnd):
    d.ellipse([x - 7, y - 30, x + 7, y - 16], fill=(240, 200, 160), outline=INK)
    d.rectangle([x - 8, y - 33, x + 8, y - 27], fill=(50, 40, 40))
    d.rectangle([x - 9, y - 16, x + 9, y + 4], fill=shirt, outline=INK)


def draw(kind, rnd):
    im = Image.new("RGB", (W, H), (200, 200, 200))
    d = ImageDraw.Draw(im)
    pal = dict(wall=(236, 228, 210), floor=(196, 186, 168), ceil=(250, 246, 236), side=(214, 206, 190))
    if kind in ("pharmacy", "clinic", "convenience", "telecom"):
        pal = dict(wall=(246, 248, 246), floor=(214, 220, 222), ceil=(255, 255, 255), side=(228, 232, 232))
    if kind in ("tealeaf", "herbal", "rice", "agri", "general"):
        pal = dict(wall=(206, 180, 140), floor=(170, 150, 120), ceil=(226, 210, 180), side=(190, 166, 130))
    bx0, by0, bx1, by1 = room(d, **pal)
    if kind == "general":      # 百貨行：水桶、臉盆、掃把、毛巾
        shelf(d, bx0 + 4, by0 + 4, bx1 - 4, by1 - 6, 3, [(220, 60, 60), (60, 140, 220), (240, 200, 60), (90, 180, 110), (240, 140, 180)], 10, 3, rnd)
        for x in range(10, 60, 13):
            d.ellipse([x, 92, x + 14, 112], fill=[(230, 70, 70), (70, 150, 230), (90, 190, 120)][x % 3], outline=INK)
        for x in (200, 212, 224):
            d.line([(x, 50), (x + 6, 118)], fill=(150, 100, 60), width=3)
            d.polygon([(x + 2, 112), (x + 12, 112), (x + 9, 124), (x + 1, 124)], fill=(220, 190, 90), outline=INK)
        for x in range(60, 200, 22):
            d.rectangle([x, 2, x + 14, 22], fill=[(250, 250, 250), (250, 190, 200), (180, 220, 250)][x % 3], outline=INK)
    elif kind == "tealeaf":    # 茶行：茶罐牆、大茶袋、泡茶桌
        shelf(d, bx0 + 4, by0 + 4, bx1 - 4, by1 - 10, 3, [(40, 110, 70), (180, 40, 40), (200, 160, 60), (90, 60, 40)], 9, 4, rnd)
        for x in (24, 54):
            d.rounded_rectangle([x, 80, x + 26, 120], 6, fill=(230, 215, 170), outline=INK)
            d.text((x + 8, 92), "TEA", fill=(60, 120, 60))
        counter(d, 150, 92, 236, 118, (130, 82, 50))
        for x in (165, 185, 205):
            d.ellipse([x, 82, x + 10, 92], fill=(250, 250, 245), outline=INK)
    elif kind == "drink":      # 手搖飲：菜單燈箱、封口機、杯子
        d.rectangle([bx0 + 6, by0 + 4, bx1 - 6, by0 + 34], fill=(40, 40, 50))
        for i in range(10):
            d.rectangle([bx0 + 12 + i * 16, by0 + 8, bx0 + 22 + i * 16, by0 + 30], fill=[(250, 210, 90), (250, 160, 120), (160, 220, 170)][i % 3])
        counter(d, 20, 84, 236, 120, (245, 245, 240))
        for x in range(40, 220, 22):
            d.rectangle([x, 66, x + 12, 84], fill=(220, 180, 120), outline=INK)
            d.ellipse([x + 2, 76, x + 6, 80], fill=(40, 30, 30))
            d.line([(x + 8, 60), (x + 6, 70)], fill=(230, 60, 60), width=2)
        person(d, 128, 84, (230, 90, 70), rnd)
    elif kind in ("breakfast", "snack", "noodle", "buffet"):
        counter(d, 14, 82, 242, 120, (200, 200, 205) if kind != "buffet" else (230, 225, 210))
        if kind == "breakfast":    # 煎台、蛋餅、吐司
            d.rectangle([24, 74, 110, 82], fill=(60, 60, 65), outline=INK)
            for x in range(30, 104, 18):
                d.ellipse([x, 70, x + 14, 78], fill=(250, 220, 120), outline=INK)
            for x in range(130, 230, 14):
                d.rectangle([x, 66, x + 10, 82], fill=(240, 210, 160), outline=INK)
            d.rectangle([bx0 + 10, by0 + 4, bx1 - 10, by0 + 26], fill=(255, 255, 255), outline=INK)
        elif kind == "noodle":     # 麵攤：大湯鍋冒煙、碗
            for x in (30, 80):
                d.rectangle([x, 56, x + 40, 82], fill=(180, 180, 185), outline=INK)
                for k in range(3):
                    d.arc([x + 6 + k * 10, 30, x + 18 + k * 10, 56], 200, 340, fill=(255, 255, 255), width=2)
            for x in range(140, 230, 18):
                d.ellipse([x, 72, x + 14, 82], fill=(250, 250, 250), outline=INK)
                d.ellipse([x + 3, 72, x + 11, 76], fill=(230, 170, 90))
        elif kind == "buffet":     # 自助餐：一排菜盤
            for i in range(10):
                x = 22 + i * 21
                d.rectangle([x, 70, x + 17, 82], fill=(200, 200, 205), outline=INK)
                d.ellipse([x + 2, 72, x + 15, 80], fill=[(90, 170, 80), (230, 150, 60), (200, 70, 60), (240, 220, 120)][i % 4])
        else:                      # 小吃：蒸籠、鐵板
            for x in (30, 52, 74):
                d.rectangle([x, 60, x + 20, 82], fill=(200, 160, 100), outline=INK)
            d.rectangle([110, 74, 200, 82], fill=(60, 60, 65), outline=INK)
            for x in range(116, 196, 14):
                d.ellipse([x, 70, x + 12, 78], fill=(230, 200, 140), outline=INK)
        for x in (48, 210):     # 店內圓桌與板凳
            d.ellipse([x - 16, 92, x + 16, 100], fill=(230, 80, 70) if kind != "buffet" else (240, 240, 240), outline=INK)
        person(d, 128, 82, (250, 250, 250), rnd)
    elif kind in ("pharmacy", "herbal"):
        if kind == "pharmacy":
            shelf(d, bx0 + 4, by0 + 4, bx1 - 4, by1 - 8, 4, [(250, 250, 250), (90, 170, 220), (240, 120, 120), (120, 200, 140)], 8, 3, rnd)
            d.rectangle([110, 2, 146, 22], fill=(40, 160, 80))
            d.rectangle([124, 4, 132, 20], fill=(255, 255, 255))
            d.rectangle([116, 9, 140, 15], fill=(255, 255, 255))
        else:   # 中藥房：百子櫃
            d.rectangle([bx0 + 4, by0 + 4, bx1 - 4, by1 - 6], fill=(140, 90, 50), outline=INK)
            for r in range(5):
                for c in range(10):
                    x, y = bx0 + 10 + c * 16, by0 + 8 + r * 13
                    d.rectangle([x, y, x + 12, y + 10], fill=(170, 115, 70), outline=INK)
                    d.ellipse([x + 5, y + 4, x + 7, y + 6], fill=(240, 210, 120))
        counter(d, 30, 90, 226, 120, (250, 250, 250) if kind == "pharmacy" else (120, 80, 50))
    elif kind == "clinic":     # 診所：候診椅、掛號櫃台、綠十字
        counter(d, 150, 84, 236, 118, (250, 250, 250))
        d.rectangle([170, 30, 220, 60], fill=(40, 160, 80))
        d.rectangle([190, 34, 200, 56], fill=(255, 255, 255))
        d.rectangle([178, 41, 212, 49], fill=(255, 255, 255))
        for x in range(16, 130, 18):
            d.rectangle([x, 96, x + 14, 108], fill=(90, 170, 210), outline=INK)
            d.rectangle([x, 84, x + 14, 96], fill=(110, 190, 230), outline=INK)
    elif kind == "hair":       # 理髮：鏡子、理髮椅、旋轉燈
        for x in (52, 128, 204):
            d.rectangle([x - 26, by0 + 6, x + 26, by0 + 46], fill=(200, 230, 245), outline=INK, width=2)
            d.rectangle([x - 12, 82, x + 12, 104], fill=(40, 40, 50), outline=INK)
            d.rectangle([x - 4, 104, x + 4, 116], fill=(150, 150, 155))
        for y in range(4, 60, 8):
            d.rectangle([2, y, 12, y + 4], fill=(220, 40, 40))
            d.rectangle([2, y + 4, 12, y + 8], fill=(40, 80, 200))
    elif kind in ("scooter", "bike"):
        d.rectangle([bx0 + 6, by0 + 4, bx1 - 6, by0 + 30], fill=(150, 150, 160), outline=INK)   # 工具牆
        for x in range(bx0 + 12, bx1 - 12, 14):
            d.line([(x, by0 + 8), (x, by0 + 24)], fill=(80, 80, 90), width=3)
        for x in (40, 128, 212):
            if kind == "scooter":
                d.ellipse([x - 26, 100, x - 10, 116], fill=(30, 30, 30))
                d.ellipse([x + 10, 100, x + 26, 116], fill=(30, 30, 30))
                d.polygon([(x - 22, 100), (x + 22, 100), (x + 16, 84), (x - 6, 84), (x - 12, 70), (x - 18, 70)],
                          fill=[(230, 60, 60), (250, 250, 250), (60, 120, 220)][x % 3], outline=INK)
                d.rectangle([x - 8, 78, x + 14, 84], fill=(40, 40, 40))
            else:
                for cx in (x - 16, x + 16):
                    d.ellipse([cx - 11, 92, cx + 11, 114], outline=INK, width=3)
                d.line([(x - 16, 103), (x, 90), (x + 16, 103), (x - 16, 103)], fill=(40, 140, 200), width=3)
    elif kind == "lottery":
        counter(d, 20, 80, 236, 120, (230, 50, 40))
        d.rectangle([bx0 + 6, by0 + 4, bx1 - 6, by0 + 40], fill=(250, 210, 60), outline=INK)
        for i in range(8):
            d.ellipse([bx0 + 14 + i * 20, by0 + 12, bx0 + 28 + i * 20, by0 + 26], fill=(230, 50, 40))
        for x in range(30, 230, 16):
            d.rectangle([x, 66, x + 12, 80], fill=(250, 250, 250), outline=INK)
    elif kind in ("agri", "rice"):   # 米袋、肥料袋堆
        cols = [(240, 236, 220), (220, 210, 180)] if kind == "rice" else [(60, 140, 70), (230, 200, 60), (230, 230, 230)]
        for r in range(3):
            for c in range(9):
                x, y = 12 + c * 26 + (r % 2) * 12, 106 - r * 16
                d.rounded_rectangle([x, y, x + 24, y + 16], 4, fill=cols[(r + c) % len(cols)], outline=INK)
        shelf(d, bx0 + 20, by0 + 4, bx1 - 20, by0 + 40, 2, [(200, 60, 60), (60, 120, 200), (240, 200, 70)], 9, 3, rnd)
    elif kind == "fruit":      # 水果攤：一籃一籃
        for r in range(2):
            for c in range(7):
                x, y = 14 + c * 34, 74 + r * 22
                d.rectangle([x, y + 8, x + 30, y + 20], fill=(170, 120, 70), outline=INK)
                col = [(250, 200, 60), (240, 80, 60), (130, 200, 80), (250, 150, 60)][(r + c) % 4]
                for k in range(4):
                    d.ellipse([x + 2 + k * 7, y, x + 10 + k * 7, y + 9], fill=col, outline=INK)
        d.rectangle([bx0 + 30, by0 + 6, bx1 - 30, by0 + 30], fill=(250, 250, 250), outline=INK)
    elif kind == "convenience":
        shelf(d, bx0 + 4, by0 + 4, bx1 - 4, by1 - 8, 4, [(240, 80, 60), (60, 140, 230), (250, 210, 60), (120, 200, 120), (250, 250, 250)], 7, 2, rnd)
        counter(d, 150, 88, 240, 120, (250, 250, 250))
        d.rectangle([20, 60, 60, 120], fill=(210, 235, 250), outline=INK, width=2)   # 冰箱
    elif kind == "clock":      # 鐘錶眼鏡：玻璃櫃＋牆上掛鐘
        for x in range(bx0 + 16, bx1 - 10, 30):
            d.ellipse([x, by0 + 8, x + 22, by0 + 30], fill=(250, 250, 245), outline=INK, width=2)
            d.line([(x + 11, by0 + 19), (x + 11, by0 + 11)], fill=INK, width=2)
            d.line([(x + 11, by0 + 19), (x + 17, by0 + 19)], fill=INK, width=2)
        d.rectangle([20, 84, 236, 120], fill=(200, 230, 245), outline=INK, width=2)
        for x in range(28, 230, 16):
            d.ellipse([x, 96, x + 10, 104], outline=(60, 60, 70), width=2)
    elif kind == "telecom":
        for x in range(bx0 + 10, bx1 - 10, 22):
            d.rounded_rectangle([x, by0 + 10, x + 14, by0 + 36], 3, fill=(40, 40, 50), outline=INK)
            d.rectangle([x + 2, by0 + 13, x + 12, by0 + 31], fill=(120, 190, 240))
        counter(d, 20, 86, 236, 120, (90, 160, 220))
    elif kind == "claw":       # 夾娃娃機
        for x in (8, 72, 136, 200):
            d.rectangle([x, 20, x + 50, 120], fill=[(250, 120, 170), (120, 190, 250), (250, 200, 80), (150, 220, 140)][x % 4], outline=INK, width=2)
            d.rectangle([x + 6, 28, x + 44, 84], fill=(220, 240, 250), outline=INK)
            for k in range(5):
                d.ellipse([x + 8 + k * 7, 70, x + 16 + k * 7, 80], fill=[(250, 220, 120), (240, 150, 150), (180, 140, 230)][k % 3])
    elif kind == "craft":
        for x in range(bx0 + 10, bx1 - 10, 34):
            d.rectangle([x, by0 + 8, x + 26, by0 + 34], fill=[(250, 220, 150), (200, 230, 200), (230, 200, 230)][x % 3], outline=INK, width=2)
        counter(d, 40, 88, 216, 118, (200, 160, 110))
    elif kind == "shoes":
        shelf(d, bx0 + 4, by0 + 4, bx1 - 4, by1 - 8, 4, [(250, 250, 250), (40, 40, 50), (230, 80, 70), (80, 140, 220)], 14, 4, rnd)
    else:
        d.rectangle([bx0, by0, bx1, by1], fill=pal["wall"])
    d.rectangle([0, 0, W - 1, H - 1], outline=INK, width=3)    # 門框
    return im


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    rnd = random.Random(1108)
    atlas = Image.new("RGB", (1024, 1024), (128, 128, 128))
    for i, k in enumerate(KINDS):
        atlas.paste(draw(k, rnd), ((i % 4) * W, (i // 4) * H))
    atlas.save(OUT)
    print(OUT, len(KINDS), "kinds")


if __name__ == "__main__":
    main()
