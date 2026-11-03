"""face_set2.py gen|patch <teacher> <pose-dir> [嘴型 ...] — 老師斜臉嘴型 v2（規格卡 rdq/RDQ-spec-teacher-tilted-mouths-20261102.md）。
舊做法（face_set.py）用遮罩請 AI 重畫嘴，AI 其實會重畫整張臉，剪嘴巴貼回後角度和膚色對不上（灰色痕跡，Cosmo 頭較斜更明顯）。
新做法和 Amy／Ben 的 mouth_variants.py 相同：
gen  : 以 face-base.png（臉部 1024 圖）為參考，請 Codex「只改嘴型、跟著頭的角度」生成 face2-<嘴型>.png；
       Codex 回報用量到頂時，改用 gpt-image-2 API（medium）補（老師 2026-11-02 同意，上限 US$6）。已存在就略過。
patch: 相位相關對位（遮掉嘴巴，只用臉和頭髮對齊）→ 只取「和原圖不同、在嘴巴附近」的像素，羽化、對色 →
       回到 x2 渲染圖座標，存成 <pose-dir>/patches-v2/<嘴型>.png＋patches.json（格式同舊版；眨眼沿用舊貼片）＋對照表 mouth2-sheet.jpg。
"""
import sys, json, re, shutil, subprocess, pathlib, time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
mode, teacher, pdir = sys.argv[1:4]
D = HERE.parent / 'characters' / teacher / pdir          # 例：face-cosmo-P04-v1
POSE = pdir.replace('face-', '')                          # cosmo-P04-v1
CFG = json.loads((HERE.parent / 'characters' / teacher / 'face-config.json').read_text(encoding='utf-8')).get(POSE, {})
MOUTH = tuple(CFG.get('mouth', (410, 588, 650, 735)))    # 1024 臉部圖中的嘴部範圍
SHAPES = {
 'M01_rest': 'lips gently closed in a relaxed soft smile, as when saying "m"',
 'M02_A': 'mouth open wide as when saying "ah", jaw dropped a little, upper teeth slightly visible, tongue low',
 'M03_E': 'lips stretched wide in a smile-like shape, upper and lower teeth visible and nearly together, as when saying "ee"',
 'M04_O': 'lips rounded into an open oval, as when saying "oh"',
 'M05_U': 'lips pushed forward into a small round pucker, as when saying "oo"',
 'M06_FV': 'upper front teeth lightly resting on the lower lip, as when saying "f"',
 'M07_L': 'mouth slightly open with the tip of the tongue touching the back of the upper front teeth, as when saying "l"',
 'M08_mid': 'mouth slightly open and relaxed, teeth close together with a small gap, as when saying "s"',
}
want = sys.argv[4:] or list(SHAPES)
PROMPT = ('Edit the attached image. Keep EVERYTHING exactly the same: same character, same face, same head angle and tilt, same eyes, '
          'eyebrows, hair, goggles, skin tone, lighting, 3D animated-film render style, same framing and size, same plain background. '
          'Change ONLY the mouth: {d}. The mouth must stay in exactly the same place on the face and follow the head\'s tilt and '
          '3/4 angle (rotated and foreshortened the same way as the face), not a flat front-facing mouth. No text anywhere.')
API = str(pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs')

def gen_codex(vid, out):
    text = ('Use your built-in image generation tool to create this image: ' + PROMPT.format(d=SHAPES[vid]) +
            f' Save the PNG as {out.name} in the current directory. Reply with the saved file path only.')
    log = D / 'logs2'; log.mkdir(exist_ok=True); lf, pf = log / f'{vid}.log', log / f'{vid}.prompt.txt'
    pf.write_text(text, encoding='utf-8')
    cmd = [shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-i', str(D / 'face-base.png'), '-']
    with open(pf, 'rb') as fi, open(lf, 'wb') as fo:
        p = subprocess.Popen(cmd, cwd=D, stdin=fi, stdout=fo, stderr=subprocess.STDOUT)
        for _ in range(84):
            if p.poll() is not None: break
            time.sleep(5)
        else: p.kill(); return 'timeout'
    txt = lf.read_text(encoding='utf-8', errors='replace')
    if not out.exists():
        m = re.findall(r'[A-Za-z]:\\[^\s\]\)\(\'"]*generated_images[^\s\]\)\(\'"]*\.png', txt)
        if m: shutil.copy(m[-1], out)
    if out.exists(): return 'ok-codex'
    return 'limit' if 'usage limit' in txt else 'fail'

def gen_api(vid, out):
    r = subprocess.run(['node', API, 'edit', '--input', str(D / 'face-base.png'), '--prompt', PROMPT.format(d=SHAPES[vid]),
                        '--output', str(out), '--size', '1024x1024', '--quality', 'medium'], capture_output=True, text=True, encoding='utf-8')
    return 'ok-api' if out.exists() else 'api-fail ' + (r.stdout + r.stderr)[-200:]

def phase_shift(a, b):
    h, w = a.shape; win = np.outer(np.hanning(h), np.hanning(w))
    A, B = np.fft.fft2((a - a.mean()) * win), np.fft.fft2((b - b.mean()) * win)
    R = A * np.conj(B); R /= np.abs(R) + 1e-9; c = np.abs(np.fft.ifft2(R)); dy, dx = np.unravel_index(np.argmax(c), c.shape)
    if dy > h // 2: dy -= h
    if dx > w // 2: dx -= w
    return int(dx), int(dy), float(c.max())

if mode == 'gen':
    limit_hit = (D / 'logs2' / 'CODEX_LIMIT').exists()
    for vid in want:
        out = D / f'face2-{vid}.png'
        if out.exists(): print(vid, 'skip', flush=True); continue
        st = 'limit' if limit_hit else gen_codex(vid, out)
        if st == 'limit':
            limit_hit = True; (D / 'logs2').mkdir(exist_ok=True); (D / 'logs2' / 'CODEX_LIMIT').write_text('codex usage limit', encoding='utf-8')
            st = gen_api(vid, out)
        print(vid, st, flush=True)

elif mode == 'patch':
    old = json.loads((D / 'patches/patches.json').read_text(encoding='utf-8'))
    CROP = old['crop_in_x2']; sx = (CROP[2] - CROP[0]) / 1024
    P = D / 'patches-v2'; P.mkdir(exist_ok=True)
    rec = {'source': old['source'], 'crop_in_x2': CROP, 'scale_x2_to_1024': 1 / sx, 'patches': {}, 'method': 'face_set2 aligned diff patch'}
    if 'B01_blink' in old['patches']:   # 眨眼沿用舊貼片（老師沒有反映問題）
        shutil.copy(D / 'patches/B01_blink.png', P / 'B01_blink.png'); rec['patches']['B01_blink'] = old['patches']['B01_blink']
    base = Image.open(D / 'face-base.png').convert('RGB'); B = np.asarray(base, np.float32)
    # 灰色痕跡的真正來源：face-base.png 的背景是淺灰色，貼片若超出臉的輪廓，就把灰色貼到畫面上。
    # → 貼片只能畫在角色本身（3D 渲染圖不透明的地方），輪廓往內縮 3 px 再羽化。
    ren = Image.open(HERE.parent / 'characters' / teacher / 'renders' / old['source']).convert('RGBA')
    A_ = ren.getchannel('A').crop(tuple(CROP)).resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.GaussianBlur(2))
    BODY = np.asarray(A_, np.float32) / 255
    mx, my = (MOUTH[0] + MOUTH[2]) / 2, (MOUTH[1] + MOUTH[3]) / 2; mw, mh = (MOUTH[2] - MOUTH[0]) / 2, (MOUTH[3] - MOUTH[1]) / 2
    Y, X = np.mgrid[0:1024, 0:1024]
    # 2026-11-03 老師：Cosmo 左臉頰有一個洞 → 原圖笑紋尾端留在貼片外；範圍往左右加寬，把整條笑紋蓋掉
    # 2026-11-03：Cosmo 笑紋往上翹，尾端在貼片上緣被切斷 → 範圍加高（往上也涵蓋），邊界改成柔和漸層，不再硬切
    near = ((X - mx) / (mw * 1.9)) ** 2 + ((Y - my) / (mh * 2.1)) ** 2 < 1
    NEAR_SOFT = np.asarray(Image.fromarray(near.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(22)), np.float32) / 255
    core = ((X - mx) / (mw * 1.2)) ** 2 + ((Y - my) / (mh * .6)) ** 2 < 1
    hole = ((X - mx) / (mw * 1.9)) ** 2 + ((Y - my) / (mh * 1.6)) ** 2 < 1
    log = {}; tiles = []
    for vid in SHAPES:
        f = D / f'face2-{vid}.png'
        if not f.exists(): continue
        V = np.asarray(Image.open(f).convert('RGB').resize((1024, 1024), Image.LANCZOS), np.float32)
        ga, gb = B.mean(2).copy(), V.mean(2).copy(); ga[hole] = ga[~hole].mean(); gb[hole] = gb[~hole].mean()
        dx, dy, peak = phase_shift(ga, gb); V = np.roll(np.roll(V, dy, 0), dx, 1)
        diff = np.abs(B - V).max(2) > 26
        m = Image.fromarray(((diff & near) | core).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(9))
        M = np.asarray(m, np.float32) / 255 * NEAR_SOFT
        M = np.asarray(Image.fromarray((M * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
        M = M * BODY
        ring = (M > .05) & (M < .6)
        gain = np.clip(B[ring].mean(0) / np.maximum(V[ring].mean(0), 1), .85, 1.15) if ring.sum() > 50 else np.ones(3)
        V = np.clip(V * gain, 0, 255)
        ys, xs = np.nonzero(M > .01); x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        patch = np.dstack([V[y0:y1, x0:x1], M[y0:y1, x0:x1] * 255]).astype(np.uint8)
        pim = Image.fromarray(patch, 'RGBA'); pim = pim.resize((max(1, round(pim.width * sx)), max(1, round(pim.height * sx))), Image.LANCZOS)
        pim.save(P / f'{vid}.png')
        rec['patches'][vid] = {'area': 'mouth', 'x2_xy': [round(CROP[0] + x0 * sx), round(CROP[1] + y0 * sx)], 'size': list(pim.size),
                               'gain': [round(float(g), 3) for g in gain]}
        log[vid] = {'shift': (dx, dy), 'peak': round(peak, 3), 'area_px': int((M > .5).sum())}
        comp = (B * (1 - M[..., None]) + V * M[..., None]).clip(0, 255).astype(np.uint8)
        tiles.append((vid, Image.fromarray(comp).crop((int(mx - 260), int(my - 330), int(mx + 260), int(my + 190)))))
    (P / 'patches.json').write_text(json.dumps(rec, indent=1), encoding='utf-8')
    (D / 'mouth2-log.json').write_text(json.dumps(log, indent=1), encoding='utf-8')
    tw = 300; sheet = Image.new('RGB', (tw * 4, (tw + 30) * ((len(tiles) + 4) // 4) + 30), 'white'); d = ImageDraw.Draw(sheet)
    allt = [('base', base.crop((int(mx - 260), int(my - 330), int(mx + 260), int(my + 190))))] + tiles
    for i, (k, im) in enumerate(allt):
        x, y = (i % 4) * tw, (i // 4) * (tw + 30); sheet.paste(im.resize((tw, tw)), (x, y + 26)); d.text((x + 6, y + 6), k, fill='black')
    sheet.save(D / 'mouth2-sheet.jpg', quality=90); print(json.dumps(log)); print(D / 'mouth2-sheet.jpg')
