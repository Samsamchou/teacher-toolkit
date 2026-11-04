"""talk_scene.py — 影片 2 對話動畫：程式畫的 2D 扁平風學生 Amy（女）、Ben（男）與三個場景（教室、家裡、走廊）。
2026-10-29 規格卡 RDQ-spec-video2-dialogues：不生圖、畫面不出現任何星期提示（沒有月曆、沒有文字）。
用法：panel(scene, t, st) 回傳 PW×PH 的 RGBA 畫面；st 說明誰在說話、嘴形、手勢、道具。
python -I talk_scene.py → 輸出三個場景的樣張 talk-preview.jpg。
"""
import math
from PIL import Image, ImageDraw

PW, PH = 1120, 660          # 對話畫面大小（放在 1920×1080 中間）
SS = 2                      # 角色先畫 2 倍再縮小，邊緣比較平滑
SKY, NAVY, CYAN, ORANGE, WHITE = (18, 28, 64), (10, 20, 50), (46, 197, 232), (255, 138, 61), (255, 255, 255)

# ---------- 場景 ----------
def _porthole(d, cx, cy, r):
    d.ellipse((cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10), fill=(200, 210, 225))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=SKY)
    for k in range(14):
        a = k * 2.399; rr = r * (0.15 + 0.8 * ((k * 37) % 100) / 100)
        x, y = cx + rr * math.cos(a), cy + rr * math.sin(a); d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=WHITE)

def _classroom():
    im = Image.new('RGBA', (PW, PH), (225, 235, 245, 255)); d = ImageDraw.Draw(im)
    d.rectangle((0, 470, PW, PH), fill=(190, 205, 222))                    # 地板
    d.rectangle((0, 462, PW, 474), fill=(46, 197, 232))                    # 光帶
    d.rounded_rectangle((330, 70, 790, 300), 18, fill=(40, 70, 70), outline=(150, 110, 70), width=10)   # 黑板（空白、沒有字）
    d.rounded_rectangle((350, 300, 770, 312), 4, fill=(150, 110, 70))
    for x in (110, 1010): _porthole(d, x, 200, 70)
    for x in (230, 890):                                                   # 兩張桌子
        d.rounded_rectangle((x - 90, 420, x + 90, 450), 10, fill=(255, 170, 110)); d.rectangle((x - 70, 450, x - 60, 520), fill=(120, 130, 150)); d.rectangle((x + 60, 450, x + 70, 520), fill=(120, 130, 150))
    for k in range(4): d.ellipse((380 + k * 110, 135, 420 + k * 110, 175), fill=[(255, 200, 80), (120, 200, 255), (255, 120, 150), (150, 230, 140)][k])  # 黑板上貼的星球
    return im

def _home():
    im = Image.new('RGBA', (PW, PH), (255, 236, 214, 255)); d = ImageDraw.Draw(im)
    d.rectangle((0, 480, PW, PH), fill=(214, 170, 130))
    d.rounded_rectangle((420, 80, 700, 300), 14, fill=(150, 210, 255), outline=WHITE, width=12)   # 窗戶：早晨的天空
    d.ellipse((580, 120, 660, 200), fill=(255, 210, 80)); d.line((560, 80, 560, 300), fill=WHITE, width=8)
    d.rounded_rectangle((40, 360, 330, 470), 24, fill=(120, 170, 255)); d.rounded_rectangle((40, 330, 120, 470), 20, fill=(90, 140, 230))   # 床
    d.rounded_rectangle((60, 340, 150, 380), 16, fill=WHITE)                                       # 枕頭
    d.rounded_rectangle((830, 260, 1060, 480), 12, fill=(200, 140, 90)); d.rectangle((840, 360, 1050, 366), fill=(160, 100, 60))   # 衣櫃
    d.ellipse((900, 120, 990, 210), fill=WHITE, outline=(80, 80, 100), width=6)                     # 時鐘（只有指針）
    d.line((945, 165, 945, 130), fill=(60, 60, 80), width=6); d.line((945, 165, 975, 165), fill=(60, 60, 80), width=5)
    return im

def _hallway():
    im = Image.new('RGBA', (PW, PH), (215, 225, 240, 255)); d = ImageDraw.Draw(im)
    d.rectangle((0, 470, PW, PH), fill=(175, 190, 210))
    for k in range(7):                                                     # 置物櫃
        x = 40 + k * 150
        d.rounded_rectangle((x, 110, x + 130, 460), 10, fill=[(46, 160, 210), (255, 150, 90)][k % 2])
        d.rectangle((x + 100, 260, x + 110, 300), fill=WHITE)
        for j in range(3): d.line((x + 20, 140 + j * 12, x + 110, 140 + j * 12), fill=(255, 255, 255, 120), width=4)
    d.rectangle((0, 462, PW, 474), fill=CYAN)
    return im

SCENES = {}
def scene_bg(name):
    if name not in SCENES: SCENES[name] = {'classroom': _classroom, 'home': _home, 'hallway': _hallway}[name]()
    return SCENES[name]

# ---------- 角色 ----------
LOOK = {
 'amy': dict(skin=(232, 180, 140), hair=(40, 28, 24), top=(255, 138, 61), trim=(46, 197, 232), bottom=(40, 60, 120), shoe=(255, 255, 255)),
 'ben': dict(skin=(250, 210, 175), hair=(120, 70, 35), top=(46, 160, 220), trim=(255, 200, 70), bottom=(60, 70, 90), shoe=(255, 120, 80)),
}
MOUTH = {'M01_rest': 'closed', 'M02_A': 'big', 'M03_E': 'wide', 'M04_O': 'round', 'M05_U': 'small', 'M06_FV': 'wide', 'M07_L': 'mid', 'M08_mid': 'mid', None: 'closed'}

def _arm(d, sx, sy, ang, length, col, skin, w):
    """肩膀 (sx, sy)，ang＝度數（0 向下、正值往外抬），回傳手的位置。"""
    a = math.radians(ang); ex, ey = sx + length * math.sin(a), sy + length * math.cos(a)
    d.line((sx, sy, ex, ey), fill=col, width=w); d.ellipse((ex - w * .7, ey - w * .7, ex + w * .7, ey + w * .7), fill=skin)
    return ex, ey

def character(who, t, mouth=None, blink=False, gesture='idle', facing=1, talking=False, prop=None):
    """畫一個角色，回傳 (RGBA 圖, 腳底中心在圖中的 x, y)。facing＝1 面向右、-1 面向左。"""
    L = LOOK[who]; S = SS; W, H = 340 * S, 560 * S
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = W / 2; bob = (4 * math.sin(t * 2 * math.pi * 2.2) if talking else 2 * math.sin(t * 2 * math.pi / 3)) * S
    foot = H - 20 * S
    # 腳與身體
    d.rounded_rectangle((cx - 50 * S, foot - 120 * S, cx - 12 * S, foot), 14 * S, fill=L['bottom'])
    d.rounded_rectangle((cx + 12 * S, foot - 120 * S, cx + 50 * S, foot), 14 * S, fill=L['bottom'])
    for x in (cx - 31 * S, cx + 31 * S): d.rounded_rectangle((x - 30 * S, foot - 18 * S, x + 30 * S, foot + 4 * S), 10 * S, fill=L['shoe'])
    body_top = foot - 270 * S + bob
    if who == 'amy': d.polygon([(cx - 70 * S, body_top + 40 * S), (cx + 70 * S, body_top + 40 * S), (cx + 95 * S, foot - 100 * S), (cx - 95 * S, foot - 100 * S)], fill=L['top'])
    else: d.rounded_rectangle((cx - 72 * S, body_top + 30 * S, cx + 72 * S, foot - 100 * S), 30 * S, fill=L['top'])
    d.rectangle((cx - 72 * S, foot - 128 * S, cx + 72 * S, foot - 112 * S), fill=L['trim'])
    # 手臂（手勢）
    sh_y = body_top + 60 * S; w = 26 * S; arm = 110 * S
    wave = 20 * math.sin(t * 2 * math.pi * 1.6)
    angs = {'idle': (12, 12), 'talk': (14, 40 + 10 * math.sin(t * 5)), 'wave': (12, 150 + wave), 'surprise': (150, 150),
            'cheer': (165 + wave * .3, 165 - wave * .3), 'point': (12, 95), 'hold': (40, 40)}[gesture]
    hands = []
    for side, ang in ((-1, angs[0]), (1, angs[1])):
        hands.append(_arm(d, cx + side * 70 * S, sh_y, side * ang, arm, L['top'], L['skin'], w))
    # 頭
    hy = body_top - 70 * S; r = 88 * S
    d.rounded_rectangle((cx - 16 * S, hy + 60 * S, cx + 16 * S, body_top + 40 * S), 8 * S, fill=L['skin'])
    if who == 'amy':
        for side in (-1, 1): d.ellipse((cx + side * 92 * S - 42 * S, hy - 70 * S, cx + side * 92 * S + 42 * S, hy + 10 * S), fill=L['hair'])   # 兩個包包頭
        for side in (-1, 1): d.ellipse((cx + side * 92 * S - 14 * S, hy - 44 * S, cx + side * 92 * S + 14 * S, hy - 16 * S), fill=CYAN)
    d.ellipse((cx - r, hy - r, cx + r, hy + r), fill=L['skin'])
    if who == 'amy':
        d.chord((cx - r - 4 * S, hy - r - 6 * S, cx + r + 4 * S, hy + r * .6), 180, 360, fill=L['hair'])
    else:
        d.chord((cx - r - 4 * S, hy - r - 8 * S, cx + r + 4 * S, hy + r * .5), 180, 360, fill=L['hair'])
        for k in range(5): x = cx - 70 * S + k * 35 * S; d.polygon([(x - 20 * S, hy - 60 * S), (x + 20 * S, hy - 60 * S), (x + 6 * S, hy - 112 * S)], fill=L['hair'])
    # 臉（面向的方向稍微偏移）
    fx = cx + facing * 12 * S
    for side in (-1, 1):
        ex, ey = fx + side * 32 * S, hy + 4 * S
        if blink: d.arc((ex - 14 * S, ey - 8 * S, ex + 14 * S, ey + 10 * S), 200, 340, fill=(40, 30, 30), width=5 * S)
        else:
            d.ellipse((ex - 13 * S, ey - 16 * S, ex + 13 * S, ey + 16 * S), fill=(40, 30, 30))
            d.ellipse((ex - 5 * S + facing * 3 * S, ey - 10 * S, ex + 3 * S + facing * 3 * S, ey - 2 * S), fill=WHITE)
        d.ellipse((ex - 18 * S + side * 6 * S, ey + 22 * S, ex + 10 * S + side * 6 * S, ey + 34 * S), fill=(255, 150, 140, 160))   # 臉頰
    if who == 'ben':
        for k in range(3): d.ellipse((fx - 50 * S + k * 8 * S, hy + 24 * S, fx - 46 * S + k * 8 * S, hy + 28 * S), fill=(190, 120, 80))  # 雀斑
    mx, my = fx, hy + 46 * S; shp = MOUTH.get(mouth, 'mid')
    if shp == 'closed': d.arc((mx - 22 * S, my - 16 * S, mx + 22 * S, my + 8 * S), 20, 160, fill=(120, 40, 40), width=5 * S)
    elif shp == 'big': d.ellipse((mx - 20 * S, my - 12 * S, mx + 20 * S, my + 22 * S), fill=(120, 30, 40)); d.ellipse((mx - 12 * S, my + 6 * S, mx + 12 * S, my + 20 * S), fill=(240, 110, 120))
    elif shp == 'wide': d.rounded_rectangle((mx - 24 * S, my - 8 * S, mx + 24 * S, my + 12 * S), 9 * S, fill=(120, 30, 40)); d.rectangle((mx - 18 * S, my - 8 * S, mx + 18 * S, my - 2 * S), fill=WHITE)
    elif shp == 'round': d.ellipse((mx - 13 * S, my - 12 * S, mx + 13 * S, my + 16 * S), fill=(120, 30, 40))
    elif shp == 'small': d.ellipse((mx - 8 * S, my - 6 * S, mx + 8 * S, my + 10 * S), fill=(120, 30, 40))
    else: d.ellipse((mx - 16 * S, my - 6 * S, mx + 16 * S, my + 10 * S), fill=(120, 30, 40))
    # 道具
    if prop == 'crayons':
        hx, hy2 = hands[1]; d.rounded_rectangle((hx - 34 * S, hy2 - 30 * S, hx + 34 * S, hy2 + 20 * S), 6 * S, fill=(255, 210, 60))
        for k, c in enumerate([(230, 60, 60), (60, 120, 230), (60, 180, 90), (160, 80, 200)]): d.rectangle((hx - 28 * S + k * 15 * S, hy2 - 52 * S, hx - 18 * S + k * 15 * S, hy2 - 28 * S), fill=c)
    elif prop == 'basketball':
        hx, hy2 = hands[1]; d.ellipse((hx - 34 * S, hy2 - 34 * S, hx + 34 * S, hy2 + 34 * S), fill=(240, 120, 40), outline=(90, 40, 20), width=3 * S)
        d.line((hx - 34 * S, hy2, hx + 34 * S, hy2), fill=(90, 40, 20), width=3 * S); d.line((hx, hy2 - 34 * S, hx, hy2 + 34 * S), fill=(90, 40, 20), width=3 * S)
    elif prop == 'guitar':
        gx, gy = cx + 10 * S, body_top + 150 * S
        d.line((gx, gy, gx + 150 * S, gy - 120 * S), fill=(120, 70, 30), width=16 * S)
        d.ellipse((gx - 70 * S, gy - 40 * S, gx + 40 * S, gy + 60 * S), fill=(220, 120, 50), outline=(120, 60, 20), width=4 * S)
        d.ellipse((gx - 30 * S, gy - 6 * S, gx + 4 * S, gy + 28 * S), fill=(60, 30, 20))
    elif prop == 'backpack':
        d.rounded_rectangle((cx - facing * 110 * S - 40 * S, body_top + 50 * S, cx - facing * 110 * S + 40 * S, body_top + 170 * S), 18 * S, fill=(255, 200, 70))
    if facing < 0: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize((W // S, H // S), Image.LANCZOS)
    return im, W // S // 2, H // S - 20

def sweat(d, x, y, k):
    if k <= 0: return
    d.polygon([(x, y - 18 * k), (x - 9 * k, y + 4 * k), (x + 9 * k, y + 4 * k)], fill=(120, 200, 255)); d.ellipse((x - 9 * k, y - 4 * k, x + 9 * k, y + 14 * k), fill=(120, 200, 255))

POS = {'amy': (330, 640), 'ben': (790, 640)}   # 腳底位置（Amy 在左、Ben 在右，面對面）

def panel(scene, t, st):
    """st: {'amy': {...}, 'ben': {...}}，每人有 mouth、blink、gesture、talking、prop；可加 'sweat'（0–1）。"""
    im = scene_bg(scene).copy()
    for who in ('amy', 'ben'):
        s = st[who]; facing = 1 if who == 'amy' else -1
        ch, fx, fy = character(who, t, s.get('mouth'), s.get('blink', False), s.get('gesture', 'idle'), facing, s.get('talking', False), s.get('prop'))
        x, y = POS[who]; im.alpha_composite(ch, (x - fx, y - fy))
    if st.get('sweat'): sweat(ImageDraw.Draw(im), POS['ben'][0] + 70, 230, st['sweat'])
    m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), 30, fill=255)
    out = Image.new('RGBA', (PW, PH), (0, 0, 0, 0)); out.paste(im, (0, 0), m)
    return out

if __name__ == '__main__':
    demo = [('classroom', {'amy': {'mouth': 'M02_A', 'gesture': 'wave', 'talking': True}, 'ben': {'mouth': None, 'gesture': 'hold', 'prop': 'crayons'}}),
            ('home', {'amy': {'mouth': None, 'gesture': 'talk'}, 'ben': {'mouth': 'M04_O', 'gesture': 'surprise', 'talking': True, 'prop': 'backpack'}, 'sweat': 1}),
            ('hallway', {'amy': {'mouth': 'M03_E', 'gesture': 'cheer', 'talking': True}, 'ben': {'mouth': None, 'gesture': 'idle', 'prop': 'guitar', 'blink': True}})]
    sheet = Image.new('RGB', (PW, PH * 3 + 40), WHITE)
    for k, (sc, st) in enumerate(demo): sheet.paste(panel(sc, 0.3, st).convert('RGB'), (0, k * (PH + 20)))
    sheet.save('talk-preview.jpg', quality=90); print('talk-preview.jpg')
