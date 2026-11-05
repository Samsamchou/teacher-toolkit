"""gen_family_art.py — 影片 4〈Families〉Emma 一家的素材（規格卡 rdq/RDQ-spec-video4-families-20261103.md）。
全部用 Codex CLI 內建生圖（老師的 ChatGPT 方案）；角色用純綠背景方便去背；畫風以兩位老師的定裝圖為參考，和 Amy／Ben 同一個科幻太空站世界。
原創造型，不照課本插圖。Codex 寫不進 G 槽：從 ~/.codex/generated_images 複製回來。已存在的圖略過。
用法：python -I gen_family_art.py <組名或 id> ...   組名：sheets（7 張定裝）、scene、emma（說話姿勢）、family（家人姿勢）、mouths（Emma 斜臉嘴型）
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'talk-art'; OUT.mkdir(exist_ok=True)
CH = HERE.parent / 'characters'
STYLE_REFS = [CH / 'nova/nova-sheet-v1-1.png', CH / 'cosmo/cosmo-sheet-v1-2.png']
STYLE = ('Match the attached reference images exactly in rendering style: stylized 3D animated-film look, soft studio lighting, '
         'rounded appealing proportions, high detail, cheerful. No text, no letters, no numbers, no logos anywhere.')
GREEN = ('Plain solid flat pure green background (#00FF00), completely uniform, no floor, no shadow on the background, '
         'the whole body fully inside the frame with margin around it. Do not use any green colour on the character.')
WORLD = 'a member of one warm, loving family living on a friendly sci-fi space station; the family shares warm brown skin tones and friendly faces. '
PEOPLE = {
 'emma': ('Emma, a cheerful 9-year-old girl, about 4 heads tall: big bright brown eyes, warm brown skin, dark brown curly hair in two puffy '
          'pigtails with small glowing yellow star clips, a sunny yellow sci-fi zip jacket with white trim, light grey leggings, white sneakers with yellow soles.'),
 'father': ('Emma\'s father, a kind tall man in his late 30s: short black hair, neat short beard, warm smile, rounded glasses, '
            'a light blue sci-fi shirt with a small chest badge, dark navy trousers, brown shoes.'),
 'mother': ('Emma\'s mother, a warm cheerful woman in her late 30s: long dark curly hair in a loose half-up style, big smile, small round earrings, '
            'a leaf-green sci-fi tunic dress with simple white leaf patterns, white flat shoes.'),
 'grandfather': ('Emma\'s grandfather, a gentle smiling man in his 70s: short white curly hair and a white moustache, round friendly face, '
                 'a beige cardigan over a light green shirt, olive trousers, holding a simple silver walking cane.'),
 'grandmother': ('Emma\'s grandmother, a sweet smiling woman in her 70s: grey curly hair in a soft bun, small green earrings, '
                 'a pink cardigan over a white blouse, a magenta long skirt, pink slippers.'),
 'sister': ('Emma\'s big sister, a lively 13-year-old girl: black hair in a high ponytail with a purple band, bright smile, '
            'a purple sci-fi hoodie with white stripes, dark jeans, purple sneakers.'),
 'brother': ('Emma\'s little brother, a playful 5-year-old boy: short black curly hair, big round eyes, a red and white striped T-shirt, '
             'blue shorts, small orange sneakers.'),
}
ART = {}
for k, desc in PEOPLE.items():
    ART[f'sheet-{k}'] = (desc + ' ' + WORLD + 'Full body, front view, standing relaxed with arms slightly away from the body, friendly closed-mouth smile. ' + GREEN, STYLE_REFS)
GROUPS = {'sheets': [f'sheet-{k}' for k in PEOPLE]}
BGREF = [HERE.parent / 'art/bg-classroom-v1.png']
ART['scene-livingroom'] = ('Background plate for a children\'s animation, wide 16:9 landscape, same playful sci-fi space-station world and rendering style as the attached image, '
                           'eye-level view. A bright cosy family living room on the space station: a big curved lavender sofa in the middle, a wide window with a '
                           'blue planet and stars, soft rug, a small round table at the front right with a phone on a tiny tripod pointing at the sofa. '
                           'Open floor in front of the sofa for people to stand and sit. No people, no characters, no text, no letters, no numbers, no posters with writing.', BGREF)
GROUPS['scene'] = ['scene-livingroom']
# 姿勢（2026-11-03 定裝圖通過後）：以定裝圖為參考，保持同一個角色；全身、綠背景。Emma 說話姿勢一律閉嘴生成（說話時再換斜臉嘴型）
KEEP = ('Use the attached image as the exact same character: same face, hair, outfit, colours and proportions. '
        'Full body in frame, expressive animated-film acting, slight 3/4 view. ' + GREEN)
EMMA = {'emma-wave': 'waving hello with her right hand raised high, bright happy face, mouth gently closed in a big smile',
        'emma-left': 'presenting someone to her left with an open palm and arm stretched out to the side (the left side of the image), head turned slightly that way, warm closed-mouth smile',
        'emma-right': 'presenting someone to her right with an open palm and arm stretched out to the side (the right side of the image), head turned slightly that way, warm closed-mouth smile',
        'emma-self': 'pointing proudly at her own chest with both thumbs, cheerful closed-mouth grin, standing tall'}
for k, d in EMMA.items(): ART[k] = (KEEP + ' Pose: ' + d + '.', ['sheet-emma.png'])
GROUPS['emma'] = list(EMMA)
FAM = ['father', 'mother', 'grandfather', 'grandmother', 'sister', 'brother']
for k in FAM:
    ART[f'{k}-wave'] = (KEEP + ' Pose: giving a friendly wave with one hand at shoulder height, warm closed-mouth smile, standing naturally' +
                        (' and still holding the walking cane in the other hand' if k == 'grandfather' else '') + '.', [f'sheet-{k}.png'])
GROUPS['family'] = [f'{k}-wave' for k in FAM]
MSHAPE = {'mid': 'mouth slightly open as if speaking softly, a small gap between the lips, a hint of the upper teeth',
          'ah': 'mouth opened wide saying "ah", jaw dropped a little, tongue visible inside',
          'oh': 'lips rounded into an open "o" shape saying "oh"',
          'ee': 'lips apart in a wide "ee" shape, upper and lower teeth showing'}
for k in EMMA:
    for sh, d in MSHAPE.items():
        ART[f'mp-{k}-{sh}'] = ('Edit the attached image. Keep EVERYTHING exactly the same: same character, same pose, same head tilt, '
            'same eyes, eyebrows and expression, same hands, same outfit, same framing and size, same plain pure green (#00FF00) background. '
            f'Change ONLY the mouth: {d}. The mouth must stay in exactly the same place on the face and follow the head\'s tilt and '
            '3/4 angle (rotated and foreshortened the same way as the face), not a flat front-facing mouth.', [f'{k}.png'])
GROUPS['mouths'] = [f'mp-{k}-{sh}' for k in EMMA for sh in MSHAPE]

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    prompt, refs = ART[k]
    refs = [r if isinstance(r, pathlib.Path) else OUT / r for r in refs]
    text = (f'Use your built-in image generation tool to create this image: {prompt} {STYLE} '
            f'Save the PNG as {k}.png in the current directory. Reply with the saved file path only.')
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
    keys = [k for a in sys.argv[1:] for k in GROUPS.get(a, [a])]
    with cf.ThreadPoolExecutor(3) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
