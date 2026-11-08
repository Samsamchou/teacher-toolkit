"""gen_refs.py — 影片 8 桌上微縮情境動畫（畫風 H）的參考圖（Codex，0 元）。
- veh-*.png：8 個交通工具玩具（白底，之後上傳 Tripo Studio 轉 3D；bus、school、stop 沿用畫風 H 試片的 GLB）。
- stand-*.png：十位朋友的全身圖（白底，做成紙片立牌）；用影片 7 照片卡當參考，同一張臉、同一套衣服＋書包。
圖裡不能有任何文字或數字。用法：python -I gen_refs.py [id ...]
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
ART = HERE.parent / 'art'
sys.path.insert(0, str(HERE.parent))
from script_v1 import KIDS
OUT = HERE / 'refs'; OUT.mkdir(exist_ok=True)
TOY = ('a single toy miniature, like a chunky vinyl toy (about 15 cm long), seen from a 3/4 front-side view. Simple rounded shapes, '
       'stylized 3D animated-film toy look, glossy painted surfaces. Full object visible, centered, plain pure white background, soft even studio lighting, '
       'no shadow on the background, no people, no other objects, no text, no letters, no numbers anywhere.')
VEH = {
 'veh-bike': 'a red children\'s bicycle with a small front basket and a brown seat, standing upright on its kickstand',
 'veh-car': 'a small rounded light-blue family car with four doors and big windows',
 'veh-metro': 'a short two-car metro train, white body with a blue stripe, big front windows, on a short straight piece of track',
 'veh-scooter': 'a mint-green motor scooter (Vespa-like moped) with a long brown seat for two people, standing on its stand',
 'veh-taxi': 'a rounded yellow taxi car with a small plain blank white roof light (no writing) and a thin black checker stripe along the side',
 'veh-train': 'a short passenger train (engine plus one carriage), silver with an orange stripe, on a short straight piece of track',
 'veh-boat': 'a small white ferry boat with a blue roof cabin, round windows and a little red-and-white life ring, flat bottom (no water)',
 'veh-plane': 'a small friendly white passenger airplane with blue tail and blue stripe, propellers on the wings, no face, landing gear down',
}
REFS = {k: ([], f'Use your built-in image generation tool to create one image: {TOY} The toy is {v}.') for k, v in VEH.items()}
for name, p, ctry, ride, zh in KIDS:
    REFS[f'stand-{name.lower()}'] = ([ART / f'kid-{name.lower()}.png'],
        'Use your built-in image generation tool to create one image: a full-body character illustration of the SAME child as in the attached image '
        '(same face, same hair, same clothes), standing straight and facing the viewer, smiling, arms relaxed, wearing a school backpack, '
        'whole body from head to shoes visible, shoes flat on the ground line. Same stylized 3D animated-film rendering. '
        'Plain pure white background, no shadow, no other objects, no text, no letters, no flags.')

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
