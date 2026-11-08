"""gen_art8.py — 影片 8〈I go to school by bus.〉插圖：11 張交通工具圖卡＋10 張「朋友＋交通工具」照片卡（規格卡 rdq/RDQ-spec-video8-go-to-school-20261108.md）。
Codex CLI 內建生圖（老師的 ChatGPT 方案，0 元）。圖裡不能有任何文字（車身、招牌、車牌都空白），不畫國旗。
交通工具卡參考影片 7 朋友照片卡的畫風；朋友卡用該朋友自己的照片卡當參考（同一張臉、同一套衣服）。
Codex 寫不進 G 槽：從 ~/.codex/generated_images 複製回來。用法：python -I gen_art8.py [id ...]（不給就全部；已存在的略過）
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from script_v1 import KIDS
OUT = HERE / 'art'; OUT.mkdir(exist_ok=True)
STYLE_REF = [OUT / 'kid-lily.png']
NOTEXT = ('No text, no letters, no numbers, no route numbers, no licence plates with writing, no signs with writing, no logos, '
          'no flags of any country anywhere in the image.')
CARD = ('A picture card for a children\'s English lesson, square 1:1, same stylized 3D animated-film rendering style as the attached image '
        '(soft lighting, rounded shapes, cheerful colours), sunny morning, simple uncluttered background. ')
RIDE = {
 'ride-bike': 'One bright red children\'s bicycle with a front basket, side view, standing on a quiet tree-lined street. No people.',
 'ride-bus': 'One friendly yellow city bus, three-quarter front view, at a bus stop on a sunny street. The destination display is blank. No people visible.',
 'ride-car': 'One small family car in light blue, three-quarter front view, on a clean neighbourhood street. No people visible.',
 'ride-metro': 'One modern metro train (light rail style, white with a blue stripe) arriving at a bright elevated station platform. No people visible.',
 'ride-scooter': 'One mint-green motor scooter (moped) with two helmets hanging on it, side view, parked on a street. No people.',
 'ride-taxi': 'One yellow taxi car, three-quarter front view, with a plain blank roof light, on a city street. No people visible.',
 'ride-train': 'One long passenger train (silver with an orange stripe) running through green countryside, three-quarter view. No people visible.',
 'ride-foot': 'Two happy schoolchildren with backpacks walking side by side on a sidewalk, seen from the side, mid-step, small in the frame.',
 'ride-boat': 'One small white ferry boat with a blue roof sailing on calm blue water near a harbour, three-quarter view. No people visible.',
 'ride-plane': 'One small friendly passenger airplane flying in a blue sky with fluffy clouds, three-quarter view.',
 'ride-school': 'One cheerful elementary school building with a clock tower, a playground and trees in front, three-quarter view. No people.',
}
ART = {k: (STYLE_REF, CARD + v + ' ' + NOTEXT) for k, v in RIDE.items()}
GO = {   # 朋友上學的樣子（照片卡）
 'Mia': 'standing on the deck of a small white ferry boat on blue harbour water, holding the rail, wearing a backpack',
 'Raj': 'sitting by the window inside a passenger train, wearing a backpack on his lap, countryside outside',
 'Yuki': 'riding a red bicycle with a front basket on a tree-lined street, wearing a bicycle helmet and a backpack',
 'Wei': 'standing on a bright elevated metro platform next to an arriving white-and-blue metro train, wearing a backpack',
 'Sofia': 'sitting by the window seat inside a small airplane, clouds outside the window, wearing a backpack on her lap',
 'Kai': 'sitting behind his father on a mint-green motor scooter, both wearing helmets, Kai wearing a backpack; the father is seen from behind or side, face not important',
 'Lily': 'getting on a friendly yellow city bus at a bus stop, wearing a backpack, the bus door open',
 'Tom': 'sitting in the back seat of a light-blue family car, seat belt on, waving through the open window, wearing a backpack',
 'Jisu': 'sitting in the back seat of a yellow taxi with a blank roof light, waving through the open window, wearing a backpack',
 'Nam': 'walking happily on a sidewalk toward a school building, wearing a backpack, mid-step',
}
for name, p, ctry, ride, zh in KIDS:
    ART[f'go-{name.lower()}'] = ([OUT / f'kid-{name.lower()}.png'],
        f'A photo card for a children\'s English lesson, square 1:1, same stylized 3D animated-film rendering style as the attached image. '
        f'The SAME child as in the attached image (same face, same hair, same clothes), {GO[name]}, on a sunny morning, going to school. '
        f'The child is clearly visible and happy. {NOTEXT}')

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
