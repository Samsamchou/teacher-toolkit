"""gen_refs9.py — 影片 9 桌上微縮情境動畫的參考圖（Codex，0 元；圖裡不能有任何字）。
- stand-ken：Ken 全身站姿（照二水小行星 Ken：黑刺髮、頭上護目鏡、深藍＋橘色外套、深藍長褲、橘白球鞋），做紙片立牌。
- wx-sunny／cloudy／rainy／cold：WEATHER 圖字卡的圖（字用程式疊）。
用法：python -I gen_refs9.py [id ...]
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'refs'; OUT.mkdir(exist_ok=True)
ICON = ('a single cute weather illustration for a children\'s classroom flashcard, stylized 3D animated-film look, soft rounded shapes, '
        'bright friendly colors, centered, plain pure white background, no shadow on the background, no people, no faces on the objects, '
        'no text, no letters, no numbers anywhere. Square image.')
REFS = {
 'stand-ken': ([OUT / 'ken-ref.png'],
   'Use your built-in image generation tool to create one image: a full-body character illustration of the SAME boy as in the attached image '
   '(same face, same spiky black hair, same orange goggles on his head, same navy-and-orange jacket, same navy pants, same orange-and-white sneakers), '
   'standing straight and facing the viewer, smiling, arms relaxed at his sides, hands open (not fists), whole body from head to shoes visible, '
   'shoes flat on the ground line. Same stylized 3D animated-film rendering. Plain pure white background, no stage, no shadow, no other objects, no text, no letters.'),
 'wx-sunny': ([], f'Use your built-in image generation tool to create one image: {ICON} The picture: a big bright yellow sun (no face) with rays in a clear light-blue round sky patch.'),
 'wx-cloudy': ([], f'Use your built-in image generation tool to create one image: {ICON} The picture: two fluffy grey-white clouds overlapping, one partly covering a small pale sun behind them.'),
 'wx-rainy': ([], f'Use your built-in image generation tool to create one image: {ICON} The picture: a dark grey rain cloud with many blue raindrops falling, and an open yellow umbrella below it.'),
 'wx-cold': ([], f'Use your built-in image generation tool to create one image: {ICON} The picture: a thick red knitted scarf and a blue knitted beanie hat with snowflakes falling around them, and a thermometer showing a very low level.'),
}

# 2026-11-18 老師：Ken 說話要對嘴 → 同一張圖只改嘴巴（之後只把嘴巴那一小塊貼回原圖）
MOUTH = {'small': 'slightly open, relaxed, showing a little of the upper teeth (like saying "eh")',
         'open': 'wide open in a happy talking shape, showing upper teeth and a bit of tongue (like saying "ah")',
         'round': 'small and rounded into an "o" shape with pursed lips (like saying "oo")'}
for k, v in MOUTH.items():
    REFS[f'mouth-ken-{k}'] = ([OUT / 'stand-ken.png'],
        'Use your built-in image generation tool to edit the attached image. Keep EVERYTHING exactly the same: same boy, same pose, '
        'same position and size in the frame, same framing, same clothes, same colors, same lighting, same pure white background. '
        f'Change ONLY his mouth: the mouth is {v}. Eyes and eyebrows unchanged. Same image size. No text.')


def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    refs, body = REFS[k]
    text = f'{body} Save the PNG as {k}.png in the current directory. Reply with the saved file path only.'
    cmd = [shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write']
    for r in refs: cmd += ['-i', str(r)]
    log = OUT / 'logs'; log.mkdir(exist_ok=True); lf, pf = log / f'{k}.log', log / f'{k}.prompt.txt'
    pf.write_text(text, encoding='utf-8')
    with open(pf, 'rb') as fi, open(lf, 'wb') as fo:
        p = subprocess.Popen(cmd + ['-'], cwd=OUT, stdin=fi, stdout=fo, stderr=subprocess.STDOUT)
        for _ in range(84):
            if p.poll() is not None: break
            time.sleep(5)
        else: p.kill(); return k, 'FAIL timeout'
    txt = lf.read_text(encoding='utf-8', errors='replace')
    if not out.exists():
        m = re.findall(r'[A-Za-z]:\\[^\s\]\)\(\'"]*generated_images[^\s\]\)\(\'"]*\.png', txt)
        if m: shutil.copy(m[-1], out)
    if out.exists(): return k, 'ok'
    return k, 'LIMIT' if 'usage limit' in txt else 'FAIL ' + txt[-200:].replace('\n', ' ')

if __name__ == '__main__':
    keys = sys.argv[1:] or list(REFS)
    with cf.ThreadPoolExecutor(3) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
