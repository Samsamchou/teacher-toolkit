"""face_set.py prep|edit|patch <teacher> <pose> — 從姿勢渲染圖做嘴形與眨眼變體。

prep : 從 <pose>-yaw0-x2.png 切臉部 900×900 → 放大成 1024×1024 的 face-base.png，並做嘴部、眼部遮罩（透明＝可編輯）。
edit : 依 VARIANTS 逐一呼叫 gpt-image-2 edit（medium），輸出 face-<id>.png 與 .json 紀錄（已存在就略過，不重複收費）。
patch: 把每張變體只取嘴／眼的遮罩範圍（羽化）縮回原尺寸，存成 patches/<id>.png 與 patches.json（貼回位置），並做總表。
路徑：characters/<teacher>/renders/ 與 characters/<teacher>/face-<pose>/。
"""
import sys, json, subprocess, pathlib, os
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
mode, teacher, pose = sys.argv[1:4]
CHAR = HERE.parent / 'characters' / teacher
SRC = CHAR / 'renders' / f'{pose}-yaw0-x2.png'
OUT = CHAR / f'face-{pose}'; OUT.mkdir(parents=True, exist_ok=True)
CROP = (600, 0, 1500, 900)          # x2 渲染圖中的臉部範圍（Nova P01）
BG = (214, 220, 230, 255)
MOUTH = (410, 588, 650, 735)         # 1024 臉部圖中的嘴部編輯範圍（含下巴張開空間）
EYES = (330, 400, 700, 535)
KEEP = ('Edit only the transparent masked area. Keep the exact same character, face shape, skin tone, freckles, '
        'lighting, 3D animated-film render style, hair and everything outside the mask unchanged. ')
VARIANTS = [  # id, 區域, 說明
 ('M01_rest', 'mouth', 'Mouth: lips gently closed in a relaxed soft smile, as when saying "m", "b" or "p".'),
 ('M02_A', 'mouth', 'Mouth: open wide and tall as when saying "ah", jaw dropped, upper teeth slightly visible, tongue low and relaxed.'),
 ('M03_E', 'mouth', 'Mouth: lips stretched wide sideways in a smile-like shape, upper and lower teeth visible and nearly together, as when saying "ee".'),
 ('M04_O', 'mouth', 'Mouth: lips rounded into an open vertical oval, as when saying "oh".'),
 ('M05_U', 'mouth', 'Mouth: lips pushed forward into a small tight round pucker, as when saying "oo" or "w".'),
 ('M06_FV', 'mouth', 'Mouth: upper front teeth lightly resting on the lower lip, as when saying "f" or "v".'),
 ('M07_L', 'mouth', 'Mouth: slightly open, the tip of the tongue visibly touching the back of the upper front teeth, as when saying "l" or "th".'),
 ('M08_mid', 'mouth', 'Mouth: slightly open and relaxed, teeth close together with a small gap, as when saying "s", "t" or "d".'),
 ('B01_blink', 'eyes', 'Eyes: both eyes fully closed in a natural relaxed blink, curved closed eyelids with lashes, eyebrows unchanged.'),
]
BOX = {'mouth': MOUTH, 'eyes': EYES}
PATCH = {'mouth': (380, 572, 670, 750), 'eyes': (312, 385, 718, 552)}  # 貼回範圍比編輯遮罩大，蓋住原圖的嘴角與眼線

def mask(box):
    m = Image.new('RGBA', (1024, 1024), (0, 0, 0, 255))
    ImageDraw.Draw(m).ellipse(box, fill=(0, 0, 0, 0)); return m

if mode == 'prep':
    im = Image.open(SRC).convert('RGBA'); bg = Image.new('RGBA', im.size, BG); bg.alpha_composite(im)
    bg.crop(CROP).resize((1024, 1024), Image.LANCZOS).convert('RGB').save(OUT / 'face-base.png')
    for k, b in BOX.items(): mask(b).save(OUT / f'mask-{k}.png')
    prev = Image.open(OUT / 'face-base.png').convert('RGBA'); d = ImageDraw.Draw(prev)
    for b in BOX.values(): d.ellipse(b, outline=(255, 0, 0, 255), width=3)
    prev.convert('RGB').save(OUT / 'mask-preview.jpg'); print(OUT)

elif mode == 'edit':
    node = 'node'; tool = str(pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs')
    for vid, area, desc in VARIANTS:
        out = OUT / f'face-{vid}.png'
        if out.exists(): print('skip', vid); continue
        r = subprocess.run([node, tool, 'edit', '--input', str(OUT / 'face-base.png'), '--mask', str(OUT / f'mask-{area}.png'),
                            '--prompt', KEEP + desc, '--output', str(out), '--size', '1024x1024', '--quality', 'medium'],
                           capture_output=True, text=True, encoding='utf-8')
        print(vid, 'ok' if r.returncode == 0 and out.exists() else 'FAIL ' + (r.stdout + r.stderr)[-300:])

elif mode == 'patch':
    P = OUT / 'patches'; P.mkdir(exist_ok=True)
    sx = (CROP[2] - CROP[0]) / 1024; rec = {'source': SRC.name, 'crop_in_x2': CROP, 'scale_x2_to_1024': 1 / sx, 'patches': {}}
    import numpy as np
    base = Image.open(OUT / 'face-base.png').convert('RGB'); B = np.asarray(base, np.float32)
    sheet = Image.new('RGB', (5 * 400, 2 * 430), 'white'); d = ImageDraw.Draw(sheet)
    for k, (vid, area, _) in enumerate(VARIANTS):
        f = OUT / f'face-{vid}.png'
        if not f.exists(): continue
        b = PATCH[area]; pad = 12
        box = (b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad)
        inner = (b[0] + 14, b[1] + 14, b[2] - 14, b[3] - 14)   # 羽化往內縮，邊緣由原圖接手
        feather = Image.new('L', (1024, 1024), 0); ImageDraw.Draw(feather).ellipse(inner, fill=255)
        feather = feather.filter(ImageFilter.GaussianBlur(10))
        # 色彩對齊：比較遮罩邊緣一圈（環形）裡變體與原圖的平均色，逐通道調整增益
        ring = Image.new('L', (1024, 1024), 0); rd = ImageDraw.Draw(ring); rd.ellipse(b, fill=255); rd.ellipse(inner, fill=0)
        R = np.asarray(ring) > 0
        V = np.asarray(Image.open(f).convert('RGB'), np.float32)
        gain = B[R].mean(0) / np.maximum(V[R].mean(0), 1)
        V = np.clip(V * gain, 0, 255).astype(np.uint8)
        img = Image.fromarray(V).convert('RGBA'); img.putalpha(feather)
        comp = base.convert('RGBA'); comp.alpha_composite(img); comp.convert('RGB').save(OUT / f'comp-{vid}.png')
        crop = img.crop(box)
        # 回到 x2 渲染圖座標
        X0, Y0 = CROP[0] + box[0] * sx, CROP[1] + box[1] * sx
        crop = crop.resize((round(crop.width * sx), round(crop.height * sx)), Image.LANCZOS)
        crop.save(P / f'{vid}.png'); rec['patches'][vid] = {'area': area, 'x2_xy': [round(X0), round(Y0)], 'size': list(crop.size)}
        rec['patches'][vid]['gain'] = [round(float(g), 3) for g in gain]
        th = Image.open(OUT / f'comp-{vid}.png').crop((300, 330, 760, 790)).resize((400, 400))
        x, y = (k % 5) * 400, (k // 5) * 430; sheet.paste(th, (x, y + 30)); d.text((x + 8, y + 8), vid, fill='black')
    (P / 'patches.json').write_text(json.dumps(rec, indent=1), encoding='utf-8')
    sheet.save(OUT / 'face-variants-sheet.jpg', quality=90); print(OUT / 'face-variants-sheet.jpg')
