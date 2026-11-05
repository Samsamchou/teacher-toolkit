"""gen_scenes5.py — 影片 5〈Who's he? Who's she?〉三部對話的場景（規格卡 rdq/RDQ-spec-video5-whos-he-20261104.md）。
全部用 Codex CLI 內建生圖（老師的 ChatGPT 方案，不另計費）；畫風參考影片 4 的客廳場景，同一個科幻太空站世界。
不照課本插圖；圖裡不能有任何文字。Codex 寫不進 G 槽：從 ~/.codex/generated_images 複製回來。已存在的圖略過。
用法：python -I gen_scenes5.py [id ...]（不給就全部）
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'talk-art'; OUT.mkdir(exist_ok=True)
REF = [HERE.parent / 'video4-families/talk-art/scene-livingroom.png']
COMMON = ('Background plate for a children\'s animation, wide 16:9 landscape, same playful sci-fi space-station world and rendering style as the attached image '
          '(stylized 3D animated-film look, soft lighting, rounded shapes, cheerful colours), eye-level view. '
          'Leave open floor in the lower half for characters to stand. No people, no characters, no animals, no text, no letters, no numbers, '
          'no signs with writing, no logos.')
ART = {
 'scene-schoolgate': 'The front gate of a friendly elementary school on the space station, late afternoon: a rounded glowing school entrance arch on the left '
                     '(plain, no sign text), a smooth walkway, small planters with flowers, and on the right side a cute rounded red hover car parked and empty, '
                     'floating slightly above the ground with a soft glow underneath. Big window wall with a blue planet in the sky.',
 'scene-park': 'A sunny indoor park under a giant glass dome on the space station: green grass, round trees, a small pond, a wooden bench, colourful flowers, '
               'a curved path, stars and a ringed planet visible through the dome.',
 'scene-party': 'A cosy family living room on the space station decorated for a child\'s birthday party: colourful balloons, paper streamers, a table with a '
                'big birthday cake with candles and wrapped presents, warm lights, a wide window with stars. Plain decorations only, no banner with letters.',
}

# 2026-11-04 Amy 指向右側問 Who's he?（現有 amy-point 是指向觀眾）：以定裝圖為參考，綠背景，閉嘴（說話時再換斜臉嘴型）
AMY_REF = [HERE.parent / 'video2-whatday/talk-art/sheet-amy.png']
POSE = {'amy-ask': ('Use the attached image as the exact same character: same face, hair, outfit, colours and proportions. Full body in frame, '
                    'expressive animated-film acting, slight 3/4 view facing the right side of the image. Pose: curiously pointing with her right arm '
                    'stretched out toward the right side of the image (as if asking about a person standing there), head tilted slightly, eyebrows raised, '
                    'mouth gently closed in a curious smile. Plain solid flat pure green background (#00FF00), completely uniform, no floor, no shadow, '
                    'the whole body fully inside the frame with margin around it. Do not use any green colour on the character. '
                    'Stylized 3D animated-film look. No text anywhere.')}

MSHAPE = {'mid': 'mouth slightly open as if speaking softly, a small gap between the lips, a hint of the upper teeth',
          'ah': 'mouth opened wide saying "ah", jaw dropped a little, tongue visible inside',
          'oh': 'lips rounded into an open "o" shape saying "oh"',
          'ee': 'lips apart in a wide "ee" shape, upper and lower teeth showing'}
for sh, d in MSHAPE.items():   # amy-ask 的斜臉嘴型（同角度只改嘴）
    POSE[f'mp-amy-ask-{sh}'] = ('Edit the attached image. Keep EVERYTHING exactly the same: same character, same pose, same head tilt, same eyes, eyebrows and '
        'expression, same hands, same outfit, same framing and size, same plain pure green (#00FF00) background. '
        f'Change ONLY the mouth: {d}. The mouth must stay in exactly the same place on the face and follow the same head tilt and 3/4 angle.')
REFS_OF = lambda k: [OUT / 'amy-ask.png'] if k.startswith('mp-') else AMY_REF if k in POSE else REF

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    body = POSE[k] if k in POSE else f'{COMMON} {ART[k]}'
    text = (f'Use your built-in image generation tool to create this image: {body} '
            f'Save the PNG as {k}.png in the current directory. Reply with the saved file path only.')
    cmd = [shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write']
    for r in REFS_OF(k): cmd += ['-i', str(r)]
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
    keys = sys.argv[1:] or list(ART)
    with cf.ThreadPoolExecutor(3) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
