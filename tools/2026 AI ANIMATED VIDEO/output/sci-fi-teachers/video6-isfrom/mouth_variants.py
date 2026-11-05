"""mouth_variants.py — 斜臉嘴型合成（規格卡 RDQ-spec-video2-tilted-mouths-20261101）。
Codex 生的 talk-art/mp-<姿勢>-<嘴型>.png（同角度張嘴圖）→ 自動對位到閉嘴底圖 → 只取「嘴巴附近、和底圖不同」的一小塊、
羽化並校正色調 → 疊回底圖 → 去綠背景、用底圖同一個裁切範圍 → talk-art/cut/<姿勢>-m-<嘴型>.png（和底圖同尺寸，可直接換圖）。
另外輸出老師用的嘴型對照表 talk-art/mouth-table.jpg（每個姿勢一列：閉、半開、ah、o、ee）。
用法：python -I mouth_variants.py [姿勢 ...]
"""
import sys, json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from key_green import key
from gen_family_art import EMMA, MSHAPE   # 影片 4：Emma 的說話姿勢
TALKING, OPEN = list(EMMA), []

HERE = pathlib.Path(__file__).resolve().parent; ART = HERE / 'talk-art'; CUT = ART / 'cut'
META = json.loads((CUT / 'cut.json').read_text(encoding='utf-8'))
SHAPES = list(MSHAPE)   # mid, ah, oh, ee

def crop_origin(raw):
    """和 key_green.py 一樣的裁切：角色範圍外加 8 px。"""
    im = key(raw); bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    return max(0, bb[0] - 8), max(0, bb[1] - 8), (min(im.width, bb[2] + 8), min(im.height, bb[3] + 8))

def phase_shift(a, b):
    """b 要移多少 (dx, dy) 才會對齊 a（相位相關）。"""
    h, w = a.shape; win = np.outer(np.hanning(h), np.hanning(w))
    A, B = np.fft.fft2((a - a.mean()) * win), np.fft.fft2((b - b.mean()) * win)
    R = A * np.conj(B); R /= np.abs(R) + 1e-9
    c = np.abs(np.fft.ifft2(R)); dy, dx = np.unravel_index(np.argmax(c), c.shape)
    if dy > h // 2: dy -= h
    if dx > w // 2: dx -= w
    return int(dx), int(dy), float(c.max())

def build(k, sh):
    base_key = f'{k}-closed' if k in OPEN else k
    base = Image.open(ART / f'{base_key}.png').convert('RGB')
    var = Image.open(ART / f'mp-{k}-{sh}.png').convert('RGB')
    if var.size != base.size: var = var.resize(base.size, Image.LANCZOS)
    bx0, by0, (bx1, by1) = crop_origin(base)
    mx, my, w = META[k]['mouth']; mx, my = mx + bx0, my + by0
    B = np.asarray(base, np.float32); V = np.asarray(var, np.float32)
    # 對位：取頭部範圍（嘴巴上下左右 3.5 個嘴寬），把嘴巴本身蓋掉，只用臉、頭髮、眼睛對齊
    r = round(max(w, 45) * 3.5); x0, x1 = max(0, round(mx - r)), min(B.shape[1], round(mx + r)); y0, y1 = max(0, round(my - r)), min(B.shape[0], round(my + r))
    ga, gb = B[y0:y1, x0:x1].mean(2), V[y0:y1, x0:x1].mean(2)
    yy, xx = np.mgrid[y0:y1, x0:x1]; hole = ((xx - mx) / (w * 1.3)) ** 2 + ((yy - my) / (w * 1.0)) ** 2 < 1
    ga, gb = ga.copy(), gb.copy(); ga[hole] = ga[~hole].mean(); gb[hole] = gb[~hole].mean()
    dx, dy, peak = phase_shift(ga, gb)
    V = np.roll(np.roll(V, dy, 0), dx, 1)
    # 變化區：和底圖差很多的像素，限制在嘴巴附近的橢圓內，再擴大、羽化
    Y, X = np.mgrid[0:B.shape[0], 0:B.shape[1]]
    near = ((X - mx) / (w * 1.5)) ** 2 + ((Y - (my + w * .25)) / (w * 1.25)) ** 2 < 1
    core = ((X - mx) / (w * .75)) ** 2 + ((Y - my) / (w * .45)) ** 2 < 1          # 嘴巴本身一定要換
    diff = np.abs(B - V).max(2) > 28
    m = Image.fromarray(((diff & near) | core).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))
    m = m.filter(ImageFilter.GaussianBlur(max(3, w * .14)))
    M = (np.asarray(m, np.float32) / 255 * near.astype(np.float32))[..., None]
    M = np.asarray(Image.fromarray((M[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), np.float32)[..., None] / 255
    # 色調校正：比較羽化邊緣一圈的平均顏色（只取不透明、非綠色的像素）
    ring = (M[..., 0] > .05) & (M[..., 0] < .6)
    okb = (B[..., 1] - np.maximum(B[..., 0], B[..., 2])) < 20; okv = (V[..., 1] - np.maximum(V[..., 0], V[..., 2])) < 20
    sel = ring & okb & okv
    gain = np.clip(B[sel].mean(0) / np.maximum(V[sel].mean(0), 1), .85, 1.15) if sel.sum() > 50 else np.ones(3)
    V = np.clip(V * gain, 0, 255)
    out = Image.fromarray((B * (1 - M) + V * M).clip(0, 255).astype(np.uint8))
    cut = key(out).crop((bx0, by0, bx1, by1))
    name = f'{k}-m-{sh}'; cut.save(CUT / f'{name}.png')
    META[name] = dict(META[base_key]); META[name]['mouth'] = META[k]['mouth']
    area = float(M.sum()) / (w * w)
    return dict(shift=(dx, dy), peak=round(peak, 3), gain=[round(float(g), 3) for g in gain], area=round(area, 2))

def face(name, k):
    im = Image.open(CUT / f'{name}.png').convert('RGBA'); mx, my, w = META[k]['mouth']
    s = max(w, 45); box = (round(mx - s * 3.2), round(my - s * 4.6), round(mx + s * 3.2), round(my + s * 1.8))
    bg = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), (236, 240, 246, 255))
    bg.alpha_composite(im.crop(box)); return bg.convert('RGB').resize((240, 240), Image.LANCZOS)

if __name__ == '__main__':
    ks = sys.argv[1:] or TALKING
    log = {}
    for k in ks:
        for sh in SHAPES:
            if not (ART / f'mp-{k}-{sh}.png').exists(): print(k, sh, 'missing'); continue
            log[f'{k}-{sh}'] = st = build(k, sh); print(k, sh, st, flush=True)
    (CUT / 'cut.json').write_text(json.dumps(META, indent=1), encoding='utf-8')
    (ART / 'mouth-variants-log.json').write_text(json.dumps(log, indent=1), encoding='utf-8')
    # 對照表
    T = 240; cols = ['closed'] + SHAPES; head = 34
    sheet = Image.new('RGB', (150 + T * len(cols), head + T * len(ks)), 'white'); d = ImageDraw.Draw(sheet)
    try: f = ImageFont.truetype('arial.ttf', 22)
    except OSError: f = ImageFont.load_default()
    for j, c in enumerate(cols): d.text((150 + j * T + 90, 6), c, fill='black', font=f)
    for i, k in enumerate(ks):
        d.text((6, head + i * T + 100), k, fill='black', font=f)
        for j, c in enumerate(cols):
            name = (f'{k}-closed' if k in OPEN else k) if c == 'closed' else f'{k}-m-{c}'
            if (CUT / f'{name}.png').exists(): sheet.paste(face(name, k), (150 + j * T, head + i * T))
    sheet.save(ART / 'mouth-table.jpg', quality=90); print('table', ART / 'mouth-table.jpg')
