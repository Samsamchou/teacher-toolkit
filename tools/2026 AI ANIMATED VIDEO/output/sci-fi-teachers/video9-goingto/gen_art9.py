"""gen_art9.py — 影片 9 插圖：9 張地點卡＋14 張例字卡（規格卡 rdq/RDQ-spec-video9-vocab-phonics-20261118.md）。
Codex CLI 內建生圖（0 元）。圖裡不能有任何文字（招牌空白）。畫風參考影片 8 的 ride-school 卡。
用法：python -I gen_art9.py [id ...]（不給就全部；已存在的略過）
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'art'; OUT.mkdir(exist_ok=True)
STYLE_REF = [HERE.parent / 'video8-gotoschool' / 'art' / 'ride-school.png']
NOTEXT = 'No text, no letters, no numbers, no signs with writing, no logos, no flags anywhere in the image (a $ sign is allowed only where the description asks for it).'
CARD = ("A picture card for a children's English lesson, square 1:1, same stylized 3D animated-film rendering style as the attached image "
        '(soft lighting, rounded shapes, cheerful colours), simple uncluttered background. ')
PLACE = {
 'place-bank': 'One small bank building with stone columns. 2026-11-19 teacher: must clearly show MONEY and a second bank icon: a big golden dollar sign ($) emblem on the front above the door, an ATM cash machine in the wall beside the door with green banknotes coming out, and a sturdy round steel vault door visible through a side window. Three-quarter view, sunny street. No people. The only symbol allowed is the $ sign; no words.',
 'place-park': 'A green city park with a kite flying in the sky, a swing set, trees and a pond, sunny day. No people.',
 'place-supermarket': 'One bright supermarket building with glass doors, shopping carts lined up in front and fruit stands by the entrance (the sign board is blank), three-quarter view. No people.',
 'place-bookstore': 'One cosy bookstore SHOP (a store that sells books): a striped awning, the shop window full of books each with a small price tag showing a $ sign, a cash register with a few coins on the counter visible through the glass door, and a paper shopping bag with books sticking out placed by the door. Three-quarter view, on a street. No people. The only symbol allowed is the $ sign; no words.',
 'place-hospital': 'One clean white hospital building with a big red cross symbol on the front and an ambulance parked outside, three-quarter view. No people.',
 'place-train-station': 'One small train station building with a platform and a silver passenger train with an orange stripe waiting at the platform (the station sign is blank), three-quarter view. No people.',
 'place-museum': 'One grand museum building with tall columns and wide steps, a dinosaur skeleton visible through the big front window (the sign is blank), three-quarter view. No people.',
 'place-library': 'One large public library building (looks different from a small shop: wider, two floors, grey-blue stone and big glass windows) showing tall bookshelves and children sitting at long reading tables reading books inside, a big round emblem above the entrance with a simple icon of a person reading an open book, and a blue book-return drop box with books by the front steps. No price tags, no money. Three-quarter view. No words.',
 'place-post-office': 'One small post office building with a big envelope symbol above the door and a green mailbox and a red mailbox in front (no writing), three-quarter view. No people.',
}
EX = {
 'ex-cat': 'One cute orange cat sitting and smiling.', 'ex-hat': 'One blue sun hat with a ribbon, on its own.',
 'ex-car': 'One small red toy-like car, three-quarter view.', 'ex-star': 'One big shining yellow star in a dark blue night sky.',
 'ex-sister': 'One smiling girl about ten years old with a ponytail, waving.', 'ex-brother': 'One smiling boy about eight years old in a green T-shirt, waving.',
 'ex-look': 'One child looking through a big magnifying glass with one big curious eye.', 'ex-cook': 'One child in a chef hat stirring a pot on a stove in a kitchen.',
 'ex-hot': 'One bowl of very hot soup with lots of steam rising, and a red thermometer next to it.', 'ex-dog': 'One friendly brown puppy sitting and wagging its tail.',
 'ex-sit': 'One child sitting on a wooden chair with hands on knees, side view.', 'ex-pig': 'One cute pink pig standing on green grass.',
 'ex-rain': 'Rain falling from grey clouds onto puddles on a street, one yellow umbrella.', 'ex-wait': 'One child standing at a bus stop looking at a wristwatch, waiting.',
}
ART = {k: (STYLE_REF, CARD + v + ' ' + NOTEXT) for k, v in {**PLACE, **EX}.items()}


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
