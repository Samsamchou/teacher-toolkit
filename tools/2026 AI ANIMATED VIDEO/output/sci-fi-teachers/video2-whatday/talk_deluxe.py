"""talk_deluxe.py — 影片 2 對話動畫華麗版（規格卡 RDQ-spec-video2-dialogues-deluxe-20261030；分鏡 talk-storyboard-v2.md）。
素材：talk-art/（Codex 生的 Amy／Ben 姿勢圖去背、嘴形格子、三個場景）。剪紙動畫：姿勢切換、位移、擠壓伸展、跳躍，
鏡頭推拉／平移／晃動，背景景深模糊、光暈、暗角；特效全部程式畫，不出現任何文字或星期提示。
panel(no, t, lines, mouth_fn) → PW×PH 的 RGBA 畫面。lines＝這一遍播放的台詞 [(t0, t1, who, text)]。
python -I talk_deluxe.py → 輸出單格樣張 talk-art/sample-*.jpg。
"""
import json, math, pathlib, random, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import numpy as np
from talk_shots import SHOTS, SCENE

HERE = pathlib.Path(__file__).resolve().parent; ART = HERE / 'talk-art'; CUT = ART / 'cut'
PW, PH = 1184, 666                       # 對話畫面（16:9），放在 1920×1080 正中間偏上
WW, WH = 1920, 1080                      # 世界座標
FLOOR = 1010; HEIGHT = {'amy': 770, 'ben': 790}
X0 = {'amy': 700, 'ben': 1230}
META = json.loads((CUT / 'cut.json').read_text(encoding='utf-8'))
FLIP = {'amy-cheer', 'amy-sing', 'ben-crayons'}     # 讓 Amy 看向右邊（Ben）、Ben 看向左邊（Amy）
clamp = lambda x, a=0., b=1.: max(a, min(b, x))
ease = lambda k: k * k * (3 - 2 * k)

# ---------- 素材快取 ----------
_c = {}
def scene(name, blur=False):
    k = (name, blur)
    if k not in _c:
        im = Image.open(ART / f'{name}.png').convert('RGB')
        im = im.resize((WW, round(im.height * WW / im.width)), Image.LANCZOS)
        y0 = (im.height - WH) // 2; im = im.crop((0, y0, WW, y0 + WH))
        if blur: im = im.filter(ImageFilter.GaussianBlur(7))
        _c[k] = im.convert('RGBA')
    return _c[k]

def pose_img(who, pose, closed=False):
    key = f'sheet-{who}' if pose == 'sheet' else f'{who}-{pose}'
    if closed and f'{key}-closed' in META: key = f'{key}-closed'   # 說話時用閉嘴版當底圖（程式畫的嘴才蓋得乾淨）
    if key not in _c:
        im = Image.open(CUT / f'{key}.png').convert('RGBA'); mo = list(META[key]['mouth'])
        s = HEIGHT[who] / META[f'sheet-{who}']['size'][1]          # 同一角色所有姿勢用同一個比例（以定裝圖身高為準）
        if key.replace('-closed', '') in FLIP: im = im.transpose(Image.FLIP_LEFT_RIGHT); mo[0] = im.width - mo[0]
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        _c[key] = (im, [mo[0] * s, mo[1] * s, mo[2] * s])
    return _c[key]

MOUTH_OF = {'M01_rest': 'closed', 'M02_A': 'ah', 'M03_E': 'ee', 'M04_O': 'oh', 'M05_U': 'oo', 'M06_FV': 'mid', 'M07_L': 'mid', 'M08_mid': 'mid'}
def mouth_patch(who, shape, width):
    """嘴形格子只取嘴唇附近（羽化橢圓），縮放到這個姿勢的嘴寬。"""
    k = ('m', who, shape, round(width))
    if k not in _c:
        t = Image.open(ART / 'mouth' / f'{who}-{shape}.png').convert('RGB'); W_, H_ = t.size
        a = np.asarray(t, np.float32)
        green = (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 40          # 格子角落的綠底不能貼上去
        # 只取嘴唇附近：嘴唇大約在格子水平 15–85%、垂直 45–80%
        x0, x1, y0, y1 = round(W_ * .12), round(W_ * .88), round(H_ * .44), round(H_ * .82)
        crop = t.crop((x0, y0, x1, y1)); g = Image.fromarray(((~green[y0:y1, x0:x1]) * 255).astype(np.uint8))
        sc = width * 1.2 / crop.width
        size = (max(2, round(crop.width * sc)), max(2, round(crop.height * sc)))
        crop = crop.resize(size, Image.LANCZOS); g = g.resize(size, Image.BILINEAR)
        m = Image.new('L', size, 0); ImageDraw.Draw(m).ellipse((size[0] * .08, size[1] * .1, size[0] * .92, size[1] * .9), fill=255)
        m = ImageChops.multiply(m.filter(ImageFilter.GaussianBlur(max(1.5, size[0] * .08))), g)
        crop = crop.convert('RGBA'); crop.putalpha(m)
        _c[k] = crop
    return _c[k]

def _skin_mean(arr, alpha):
    """取偏膚色、不透明的像素平均（排除嘴唇、牙齒、頭髮）。"""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    m = (alpha > 200) & (r > 150) & (r - b > 40) & (r - g > 15) & (r - g < 75) & (g > 110)
    return arr[m].mean(0) if m.sum() > 20 else None

def char_frame(who, pose, mouth, lt):
    """一個角色的圖（含嘴形），回傳 (圖, 腳底在圖中的 x, y, 嘴巴 y)。"""
    im, mo = pose_img(who, pose, closed=bool(mouth))
    if mouth:   # 2026-10-30：貼真實嘴形照片會有色差，改成「先用膚色蓋掉原本的嘴，再用程式畫立體感的嘴」
        im = im.copy(); im.alpha_composite(drawn_mouth(who, pose + ('-c' if f'{who}-{pose}-closed' in META else ''), im, mo, MOUTH_OF.get(mouth, 'mid')), (0, 0))
    return im, im.width / 2, im.height, mo[1]

def face_fill(who, pose, im, x, y, cw, chh):
    """回傳蓋嘴用的圖（大小 cw*2 × chh*2.4，和 drawn_mouth 的小畫布同範圍，原圖解析度）：
    每一列取嘴巴左、右兩側（離中心 0.55–0.7 個蓋子寬）的臉色，中間線性漸層，再輕微模糊。"""
    k = ('fill', who, pose)
    if k in _c: return _c[k]
    a = np.asarray(im, np.float32); H_, W_ = a.shape[:2]
    bw, bh = round(cw * 2), round(chh * 2.4); x0, y0 = round(x - bw / 2), round(y - bh / 2)
    out = np.zeros((bh, bw, 4), np.float32)
    for r in range(bh):
        yy = min(H_ - 1, max(0, y0 + r)); row = a[yy]
        def side(sgn):
            xs = [round(x + sgn * cw * f) for f in (.55, .6, .65, .7)]
            px = [row[min(W_ - 1, max(0, q))] for q in xs]
            px = [p for p in px if p[3] > 200 and p[0] > 120 and p[0] - p[2] > 25]   # 只取膚色
            return np.mean(px, 0) if px else None
        L, R = side(-1), side(1)
        if L is None and R is None: continue
        L = R if L is None else L; R = L if R is None else R
        tt = np.linspace(0, 1, bw)[:, None]; out[r] = L * (1 - tt) + R * tt; out[r, :, 3] = 255
    if out[..., 3].max() == 0: _c[k] = None; return None
    img = Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(1.2))
    _c[k] = img
    return img

def drawn_mouth(who, pose, im, mo, shape):
    k = ('dm', who, pose, shape)
    if k in _c: return _c[k]
    S = 4; x, y, w = mo; ck = ('skin', who, pose)
    if ck not in _c:
        src = np.asarray(im.crop((round(x - w), round(y - w * .8), round(x + w), round(y + w * .8))), np.float32)
        _c[ck] = _skin_mean(src[..., :3], src[..., 3])
    skin = tuple(int(v) for v in (_c[ck] if _c[ck] is not None else (235, 175, 145)))
    big = pose in ('cheer', 'panic', 'excited', 'shocked')   # 有閉嘴版的姿勢會帶 -c，不算 big           # 原圖是張開的嘴，要蓋寬一點
    cw, chh = w * (1.55 if big else 1.25), w * (.82 if big else .7)   # 高度不能蓋到下巴輪廓，否則下巴下面會出現暗帶
    y = y - (w * .06 if big else 0)
    L = Image.new('RGBA', (im.width * S, im.height * S), (0, 0, 0, 0)) if False else None
    bw, bh = round(cw * 2 * S), round(chh * 2.4 * S)                 # 只在嘴巴附近的小畫布作畫，再縮小貼回
    P = Image.new('RGBA', (bw, bh), (0, 0, 0, 0)); d = ImageDraw.Draw(P); cx, cy = bw / 2, bh / 2
    cover = Image.new('L', (bw, bh), 0); ImageDraw.Draw(cover).ellipse((cx - cw * S * .5, cy - chh * S * .5, cx + cw * S * .5, cy + chh * S * .5), fill=255)
    cover = cover.filter(ImageFilter.GaussianBlur(w * S * .12))
    # 2026-10-30 老師：嘴巴旁有灰色痕跡 → 不再用單一平均膚色蓋，改成「每一列用嘴巴左右兩側的真實臉色漸層補上」，保留臉上的明暗
    fill = face_fill(who, pose, im, x, y, cw, chh)
    if fill is not None:
        fill = fill.resize((bw, bh), Image.BICUBIC); fill.putalpha(cover); P.alpha_composite(fill)
    else:
        sk = Image.new('RGBA', (bw, bh), (*skin, 255)); sk.putalpha(cover); P.alpha_composite(sk)
    lip, dark, tongue, tooth = (205, 100, 98, 255), (92, 28, 34, 255), (232, 122, 128, 255), (250, 248, 244, 255)
    W2 = w * S * 1.3   # 程式嘴比原圖的表情小，放大 1.3 倍
    def opening(ow, oh, oy=0, teeth=True, tng=True):
        box = (cx - ow / 2, cy - oh / 2 + oy, cx + ow / 2, cy + oh / 2 + oy)
        d.ellipse(box, fill=dark)
        if tng: d.ellipse((cx - ow * .32, cy + oy + oh * .05, cx + ow * .32, cy + oy + oh / 2 + oh * .05), fill=tongue)
        if teeth: d.chord((cx - ow * .42, cy - oh / 2 + oy - oh * .02, cx + ow * .42, cy - oh / 2 + oy + oh * .45), 180, 360, fill=tooth)
        d.ellipse(box, outline=lip, width=max(2, round(W2 * .07)))
    if shape == 'closed': d.arc((cx - W2 * .42, cy - W2 * .3, cx + W2 * .42, cy + W2 * .12), 20, 160, fill=(150, 60, 60, 255), width=max(2, round(W2 * .07)))
    elif shape == 'ah': opening(W2 * .62, W2 * .52)
    elif shape == 'ee':
        box = (cx - W2 * .4, cy - W2 * .13, cx + W2 * .4, cy + W2 * .15); d.rounded_rectangle(box, W2 * .12, fill=dark)
        d.rounded_rectangle((cx - W2 * .34, cy - W2 * .12, cx + W2 * .34, cy + W2 * .04), W2 * .06, fill=tooth)
        d.rounded_rectangle(box, W2 * .12, outline=lip, width=max(2, round(W2 * .06)))
    elif shape == 'oh': opening(W2 * .42, W2 * .46, teeth=False)
    elif shape == 'oo':
        d.ellipse((cx - W2 * .2, cy - W2 * .18, cx + W2 * .2, cy + W2 * .2), fill=lip); d.ellipse((cx - W2 * .1, cy - W2 * .08, cx + W2 * .1, cy + W2 * .1), fill=dark)
    else: opening(W2 * .48, W2 * .24, tng=False)
    # 下唇的小亮點，增加立體感
    if shape != 'closed': d.ellipse((cx - W2 * .1, cy + W2 * .2, cx + W2 * .06, cy + W2 * .25), fill=(255, 220, 210, 110))
    P = P.resize((max(1, bw // S), max(1, bh // S)), Image.LANCZOS)
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.alpha_composite(P, (round(x - P.width / 2), round(y - P.height / 2)))
    _c[k] = out
    return out

# ---------- 特效（程式畫，沒有字） ----------
def star(d, x, y, r, col, a=255):
    pts = []
    for k in range(8):
        rr = r if k % 2 == 0 else r * .32; ang = k * math.pi / 4 - math.pi / 2
        pts.append((x + rr * math.cos(ang), y + rr * math.sin(ang)))
    d.polygon(pts, fill=(*col, a))

def fx_layer(effects, lt, dur, hx, hy, who_x):
    """特效畫在世界座標的透明圖層上；hx, hy＝說話者頭部中心。"""
    L = Image.new('RGBA', (WW, WH), (0, 0, 0, 0)); d = ImageDraw.Draw(L); rnd = random.Random(int(hx))
    for e in effects:
        if e in ('sparkle', 'stars'):
            n = 6 if e == 'sparkle' else 12
            for k in range(n):
                ph = (lt * 1.6 + k / n) % 1; ang = k * 2.4; rad = (90 if e == 'sparkle' else 260) + 60 * ph
                x, y = hx + (160 if e == 'sparkle' else 0) + rad * math.cos(ang), hy + (200 if e == 'sparkle' else 120) + rad * .7 * math.sin(ang) - 80 * ph
                a = int(255 * math.sin(math.pi * ph)); star(d, x, y, 10 + 14 * math.sin(math.pi * ph), (255, 236, 140), a)
        elif e in ('question', 'question2bang'):
            k = clamp(lt / .3); bang = e == 'question2bang' and lt > dur * .55
            for j, dx in enumerate((-40, 40) if e == 'question' else (0,)):
                x, y = hx + dx + 70, hy - 230 - 14 * math.sin(lt * 5 + j); r = 42 * k
                d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 235), outline=(46, 197, 232, 255), width=5)
                if bang: d.rounded_rectangle((x - 7 * k, y - 26 * k, x + 7 * k, y + 8 * k), 5, fill=(255, 120, 60, 255)); d.ellipse((x - 7 * k, y + 14 * k, x + 7 * k, y + 28 * k), fill=(255, 120, 60, 255))
                else:
                    d.arc((x - 16 * k, y - 28 * k, x + 16 * k, y + 4 * k), 200, 400, fill=(46, 140, 220, 255), width=int(8 * k) or 1)
                    d.line((x, y + 2 * k, x, y + 12 * k), fill=(46, 140, 220, 255), width=int(8 * k) or 1); d.ellipse((x - 5 * k, y + 18 * k, x + 5 * k, y + 28 * k), fill=(46, 140, 220, 255))
        elif e == 'sweat':
            for j in range(2):
                ph = (lt * 1.3 + j * .5) % 1; x, y = hx + 110 + j * 30, hy - 120 + 120 * ph; s = 1 - ph * .4
                d.polygon([(x, y - 26 * s), (x - 13 * s, y + 4 * s), (x + 13 * s, y + 4 * s)], fill=(140, 210, 255, 230)); d.ellipse((x - 13 * s, y - 8 * s, x + 13 * s, y + 18 * s), fill=(140, 210, 255, 230))
        elif e == 'cloud':
            x, y = hx, hy - 260 + 6 * math.sin(lt * 4); k = clamp(lt / .4)
            for dx, dy, r in ((-50, 10, 40), (0, -10, 55), (55, 8, 42), (0, 25, 45)): d.ellipse((x + dx * k - r * k, y + dy - r * k, x + dx * k + r * k, y + dy + r * k), fill=(110, 120, 150, 220))
        elif e == 'paint':
            cols = [(255, 90, 90), (255, 200, 60), (80, 200, 255), (140, 230, 120), (200, 120, 255)]
            for k in range(10):
                ph = (lt * 1.2 + k / 10) % 1; ang = k * 0.63 - 2.2
                x, y = who_x - 300 + 220 * ph * math.cos(ang), 520 + 220 * ph * math.sin(ang)
                star(d, x, y, 18 * math.sin(math.pi * ph) + 4, cols[k % 5], int(255 * math.sin(math.pi * ph)))
        elif e == 'speed':
            for k in range(14):
                y = 120 + k * 60; x0 = (k * 173 + lt * 2400) % 2400 - 400
                d.line((x0, y, x0 + 260, y), fill=(255, 255, 255, 120), width=6)
        elif e == 'notes':
            for k in range(7):
                ph = (lt * .8 + k / 7) % 1; x = who_x - 120 + 300 * ph + 40 * math.sin(k + lt * 3); y = 640 - 420 * ph
                a = int(255 * math.sin(math.pi * ph)); col = [(255, 210, 80), (120, 220, 255), (255, 140, 200)][k % 3]
                d.ellipse((x - 16, y - 12, x + 16, y + 12), fill=(*col, a)); d.line((x + 14, y, x + 14, y - 60), fill=(*col, a), width=6)
                if k % 2: d.line((x + 14, y - 60, x + 40, y - 46), fill=(*col, a), width=6)
        elif e == 'spin':
            for k in range(16):
                ang = lt * 9 + k * .25; a = int(200 * (1 - k / 16))
                d.ellipse((hx - 80 + 70 * math.cos(ang) - 6, hy - 250 + 22 * math.sin(ang) - 6, hx - 80 + 70 * math.cos(ang) + 6, hy - 250 + 22 * math.sin(ang) + 6), fill=(255, 200, 120, a))
    return L

def glow_layer(cx, cy, r, col=(255, 230, 170), a=120):
    L = Image.new('RGBA', (WW // 4, WH // 4), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    d.ellipse((cx / 4 - r / 4, cy / 4 - r / 4, cx / 4 + r / 4, cy / 4 + r / 4), fill=(*col, a))
    return L.filter(ImageFilter.GaussianBlur(r / 16)).resize((WW, WH), Image.BILINEAR)

# ---------- 鏡頭 ----------
def shot_rect(shot, xs):
    ax, bx = xs['amy'], xs['ben']
    c = {'wide': (WW / 2, WH / 2, WW), 'two': ((ax + bx) / 2, 520, 1500), 'amy': (ax + 60, 470, 980), 'ben': (bx - 60, 470, 980),
         'amy-close': (ax + 30, 370, 660), 'ben-close': (bx - 30, 370, 660), 'ben-insert': (bx - 40, 480, 760)}[shot]
    return c

def camera(shot, move, lt, dur, xs, prev=None, since=0.):
    cx, cy, w = shot_rect(shot, xs)
    k = ease(clamp(lt / max(dur, .1)))
    if move == 'push': w *= 1 - .1 * k
    elif move == 'pushfast': w *= 1 - .2 * ease(clamp(lt / .35))
    elif move == 'pan': cx += -90 + 180 * k
    else: w *= 1 - .03 * k
    if prev is not None and since < .3:   # 換鏡頭時 0.3 秒緩動銜接
        e = ease(since / .3); pcx, pcy, pw = prev; cx, cy, w = pcx + (cx - pcx) * e, pcy + (cy - pcy) * e, pw + (w - pw) * e
    h = w * 9 / 16; cx = clamp(cx, w / 2, WW - w / 2); cy = clamp(cy, h / 2, WH - h / 2)
    if move == 'shake': cx += 9 * math.sin(lt * 47); cy += 7 * math.sin(lt * 61 + 1)
    return cx, cy, w

# ---------- 角色動作 ----------
# 2026-10-30 老師：人物不自然地跳動 → 拿掉說話時的上下彈跳、每格縮放（會 1 像素抖動）與換姿勢的擠壓；
# 跳躍只在該句開頭跳一次（緩起緩落），慌張穿鞋改成慢速小跳；換姿勢改用 0.25 秒交叉淡入。
JUMP = {'cheer': (55, .9), 'excited': (18, .7)}
def body_motion(who, pose, lt, talking, since_pose):
    """回傳 (y 位移, x 縮放, y 縮放)。"""
    ph = 0 if who == 'amy' else 1.7
    dy = 3 * math.sin(lt * 2 * math.pi / 3.4 + ph)              # 很慢的呼吸起伏（3 像素）
    if pose in JUMP and since_pose < 2:                         # 只跳一次
        h, per = JUMP[pose]; k = clamp(since_pose / per); dy -= h * math.sin(math.pi * k)
    if pose == 'panic': dy -= 12 * (.5 - .5 * math.cos(2 * math.pi * lt / .9))   # 單腳跳穿鞋：慢、平滑
    return dy, 1, 1

def _alpha(im, k):
    im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * k))); return im

def panel(no, t, lines, mouth_fn, talking_fn):
    """lines：這一遍的 [(t0, t1, who, text)]，依時間排序。"""
    idx = max([i for i, l in enumerate(lines) if l[0] - .15 <= t] + [0])
    t0, t1, who, text = lines[idx]; lt = t - t0; dur = t1 - t0
    amy_pose, ben_pose, shot, move, fx = SHOTS[no][idx]
    prev_idx = idx - 1 if idx > 0 else None
    # 位置：第 1 部第 1 句 Amy 走進來；第 2 部最後一句兩人衝向門口
    xs = dict(X0)
    if no == 1 and idx == 0: xs['amy'] = -260 + (X0['amy'] + 260) * ease(clamp(lt / 1.3))
    if no == 2 and idx == len(lines) - 1 and lt > 1.2: run = ease(clamp((lt - 1.2) / 1.2)) * 700; xs['amy'] += run; xs['ben'] += run
    if no == 1 and idx == 5: xs['ben'] = X0['ben'] - 160 * ease(clamp(lt / .8))      # Ben 走過去遞蠟筆
    if no == 1 and idx == 6: xs['ben'] = X0['ben'] - 160
    prev = None
    if prev_idx is not None:
        pt0 = lines[prev_idx][0]; prev = camera(SHOTS[no][prev_idx][2], SHOTS[no][prev_idx][3], t0 - pt0, lines[prev_idx][1] - pt0, X0)
    cx, cy, w = camera(shot, move, lt, dur, xs, prev, lt)
    # 背景：鏡頭越近，景深越模糊
    blur_k = clamp((1500 - w) / 800)
    bg = scene(SCENE[no]).copy()
    if blur_k > 0: bg = Image.blend(bg, scene(SCENE[no], True), blur_k)
    W_ = bg; d = ImageDraw.Draw(W_)
    heads = {}
    for wh, pose in (('amy', amy_pose), ('ben', ben_pose)):
        prev_pose = SHOTS[no][prev_idx][0 if wh == 'amy' else 1] if prev_idx is not None else pose
        since_pose = lt if prev_pose != pose else 9
        im, fx_, fy_, my = char_frame(wh, pose, mouth_fn(wh, t) if talking_fn(wh, t) else None, lt)
        dy, sx, sy = body_motion(wh, pose, lt, talking_fn(wh, t), since_pose)
        if no == 1 and idx == 0 and wh == 'amy' and lt < 1.3: dy -= 4 * abs(math.sin(lt * 6))    # 走路時輕微上下
        x, y = xs[wh] - fx_, FLOOR - fy_ + dy
        sh = Image.new('L', (int(im.width * .9), 40), 0); ImageDraw.Draw(sh).ellipse((0, 0, sh.width - 1, 39), fill=110)   # 腳下陰影
        W_.paste((20, 25, 40), (round(xs[wh] - sh.width / 2), FLOOR - 22), sh.filter(ImageFilter.GaussianBlur(8)))
        fade = clamp(since_pose / .25)
        if fade < 1:   # 換姿勢：舊姿勢淡出、新姿勢淡入
            pim, pfx, pfy, _ = char_frame(wh, prev_pose, None, lt)
            W_.alpha_composite(_alpha(pim, 1 - fade), (round(xs[wh] - pfx), round(FLOOR - pfy + dy)))
            im = _alpha(im, fade)
        W_.alpha_composite(im, (round(x), round(y)))
        heads[wh] = (xs[wh], y + my - 40)
    hx, hy = heads[who]
    W_.alpha_composite(glow_layer(hx, hy - 60, 900, a=22))
    if fx: W_.alpha_composite(fx_layer(fx, lt, dur, hx, hy, xs[who]))
    h = w * 9 / 16
    view = W_.crop((round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2))).resize((PW, PH), Image.BICUBIC)
    # 光暈（亮部柔光）＋暗角＋圓角
    small = view.resize((PW // 4, PH // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6)).resize((PW, PH), Image.BILINEAR)
    view = Image.blend(view, ImageChops.screen(view, small), .12)
    vig = vignette(); view = ImageChops.multiply(view, vig)
    m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), 30, fill=255)
    out = Image.new('RGBA', (PW, PH), (0, 0, 0, 0)); out.paste(view, (0, 0), m)
    return out

def vignette():
    if 'vig' not in _c:
        L = Image.new('L', (PW // 4, PH // 4), 0); ImageDraw.Draw(L).ellipse((-PW * .08, -PH * .1, PW // 4 + PW * .08, PH // 4 + PH * .1), fill=255)
        L = L.filter(ImageFilter.GaussianBlur(18)).resize((PW, PH), Image.BILINEAR).point(lambda v: 150 + v * 105 // 255)
        _c['vig'] = Image.merge('RGBA', [L, L, L, Image.new('L', (PW, PH), 255)])
    return _c['vig']

if __name__ == '__main__':
    import time
    from script_v1 import TALKS
    for no, sc, day, ln, _ in TALKS:
        lines = [(k * 3.0, k * 3.0 + 2.6, who, text) for k, (who, text) in enumerate(ln)]
        for k in ([1] if no == 1 else []):
            ts = time.time()
            img = panel(no, lines[k][0] + 1.2, lines, lambda w, t: 'M02_A', lambda w, t: w == lines[k][2])
            img.convert('RGB').save(ART / f'sample-talk{no}-line{k + 1}.jpg', quality=92); print(no, k, round(time.time() - ts, 2), 's')
