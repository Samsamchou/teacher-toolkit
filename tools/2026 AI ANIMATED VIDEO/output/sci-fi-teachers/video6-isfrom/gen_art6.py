"""gen_art6.py — 影片 6〈Is she from India?〉插圖：十位朋友照片卡＋三部對話場景（規格卡 rdq/RDQ-spec-video6-is-she-from-20261105.md）。
Codex CLI 內建生圖（老師的 ChatGPT 方案，0 元）。圖裡不能有任何文字，也不畫國旗（國旗由程式畫，保證正確）。
照片卡畫風參考 Amy 定裝圖；場景參考影片 4 客廳（同一個科幻太空站世界）。Codex 寫不進 G 槽：從 ~/.codex/generated_images 複製回來。
用法：python -I gen_art6.py [id ...]（不給就全部；已存在的略過）
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import KIDS
OUT = HERE / 'art'; OUT.mkdir(exist_ok=True)
KID_REF = [HERE.parent / 'video2-whatday/talk-art/sheet-amy.png']
SCENE_REF = [HERE.parent / 'video4-families/talk-art/scene-livingroom.png']
NOTEXT = 'No text, no letters, no numbers, no signs with writing, no logos, no flags of any country anywhere in the image.'

LOOK = {   # 外貌與穿著：自然的現代童裝，不用刻板服飾
 'Mia': 'a cheerful 11-year-old girl with wavy light-brown hair in a ponytail and freckles, wearing a yellow T-shirt and a sun hat',
 'Raj': 'a friendly 11-year-old boy with short black hair and warm brown skin, wearing a light blue polo shirt',
 'Yuki': 'a smiling 11-year-old girl with straight black bob-cut hair, wearing a pink hoodie',
 'Wei': 'a cheerful 11-year-old boy with short black hair and glasses, wearing a green T-shirt',
 'Sofia': 'a happy 11-year-old girl with long dark-brown curly hair, wearing a red sweater',
 'Kai': 'a smiling 11-year-old boy with short spiky black hair, wearing a white T-shirt and a blue jacket',
 'Lily': 'a cheerful 11-year-old girl with straight blonde hair and a navy headband, wearing a navy school cardigan',
 'Tom': 'a friendly 11-year-old boy with short curly black hair and dark brown skin, wearing a red and white baseball jacket',
 'Jisu': 'a smiling 11-year-old girl with long straight black hair in two low pigtails, wearing a lavender sweater',
 'Nam': 'a happy 11-year-old boy with short black hair and tanned skin, wearing an orange T-shirt',
}
ART = {}
for name, p, ctry, zh, mark in KIDS:
    ART[f'kid-{name.lower()}'] = (KID_REF,
        f'A travel photo for a children\'s animation, square 1:1, same stylized 3D animated-film rendering style as the attached character sheet '
        f'(soft lighting, rounded shapes, cheerful colours) but a DIFFERENT child: {LOOK[name]}. Upper body (waist up) in the lower-middle of the frame, '
        f'facing the viewer, waving happily. Behind the child, clearly recognisable and well lit: {mark}, on a sunny day with blue sky. '
        f'Only one person in the image. {NOTEXT}')
SCENE = ('Background plate for a children\'s animation, wide 16:9 landscape, same playful sci-fi space-station world and rendering style as the attached image '
         '(stylized 3D animated-film look, soft lighting, rounded shapes, cheerful colours), eye-level view. Leave open floor in the lower half and the left '
         'two-thirds for characters to stand. No people, no characters, no animals. ' + NOTEXT)
ART.update({
 'scene-photowall': (SCENE_REF, f'{SCENE} A bright classroom on the space station: on the RIGHT third, a big cork board on the wall with several empty '
                     'pastel paper frames pinned with colourful pins (the frames are blank, plain colour inside), a window with stars and a blue planet.'),
 'scene-intlday': (SCENE_REF, f'{SCENE} A festive school hall on the space station decorated for an international day: strings of plain single-colour '
                   'triangle bunting (no national flags), balloons, a small stage, and on the RIGHT third a tall display stand with several blank pastel '
                   'photo frames.'),
 'scene-videocall': (SCENE_REF, f'{SCENE} A cosy kid\'s room in a home on the space station: a desk on the RIGHT third with a large tablet standing up '
                     'on it whose screen is plain glowing light blue and empty, a lamp, books with blank covers, a round window with stars.'),
})

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    refs, body = ART[k]
    text = (f'Use your built-in image generation tool to create this image: {body} '
            f'Save the PNG as {k}.png in the current directory. Reply with the saved file path only.')
    cmd = [shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write']
    for r in refs: cmd += ['-i', str(r)]
    log = OUT / 'logs'; log.mkdir(exist_ok=True); lf, pf = log / f'{k}.log', log / f'{k}.prompt.txt'
    pf.write_text(text, encoding='utf-8')
    with open(pf, 'rb') as fi, open(lf, 'wb') as fo:
        p = subprocess.Popen(cmd + ['-'], cwd=OUT, stdin=fi, stdout=fo, stderr=subprocess.STDOUT)
        for _ in range(84):   # 最多等 7 分鐘
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
