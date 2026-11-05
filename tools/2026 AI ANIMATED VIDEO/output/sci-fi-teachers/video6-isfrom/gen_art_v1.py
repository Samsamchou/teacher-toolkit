"""gen_art_v1.py — 影片 2 的 3 張新插圖，用 Codex CLI 內建生圖（2026-10-23 起老師指定所有生圖走 codex exec，用 ChatGPT 方案）。
其餘 3 張情境圖沿用影片 1（v1-ctx-mon、v1-ctx-wed、v1-ctx-sun）。已存在的圖略過。用法：python -I gen_art_v1.py [id ...]
"""
import sys, subprocess, pathlib, shutil, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'art'; OUT.mkdir(exist_ok=True)
STYLE = ('Stylized 3D animated-film look, playful friendly sci-fi world for primary-school children, bright cheerful colours '
         'with soft cyan and warm orange accents, clean shapes, soft lighting, gentle depth of field. Wide landscape 3:2 image. '
         'Absolutely no text, no letters, no numbers, no words, no logos, no calendars, no signs with writing anywhere in the image.')
KIDS = 'Cheerful primary-school child (about 10 years old) in a light sci-fi school uniform, friendly face, natural pose. '
ART = {
 'ctx2-sun-read': KIDS + 'A child relaxing at home on a cosy sofa reading a picture book (blank cover) on a lazy weekend morning, '
                  'a round window shows stars and a small planet, a cat sleeping nearby, warm home lights.',
 'ctx2-mon-school': KIDS + 'A child with a backpack happily walking toward a futuristic space-station school entrance in the morning, '
                    'other children arriving too, a friendly robot crossing guard waving.',
 'today-noon': 'A bright noon scene on a friendly space station garden: the sun is high in the sky right overhead, short shadows, '
               'a big round clock tower with hands pointing to twelve (no numbers on the clock face), children having lunch at a picnic table.',
}

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    prompt = (f'Use your built-in image generation tool to create this image: {ART[k]} {STYLE} '
              f'Save the PNG as {k}.png in the current directory. Reply with the saved file path only.')
    # 提示詞從 stdin 傳（codex exec 的「-」），避免 Windows 的 codex.cmd 把引號與括號拆壞
    r = subprocess.run([shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-'], cwd=OUT, input=prompt,
                       capture_output=True, text=True, encoding='utf-8')
    if not out.exists():   # Codex 的沙箱不能寫 G 槽：從它回報的 ~/.codex/generated_images 路徑複製過來
        import re
        m = re.findall(r'[A-Za-z]:\\[^\s]*generated_images[^\s]*\.png', r.stdout + r.stderr)
        if m: shutil.copy(m[-1], out)
    return k, 'ok' if out.exists() else 'FAIL ' + (r.stdout + r.stderr)[-400:]

if __name__ == '__main__':
    keys = sys.argv[1:] or list(ART)
    with cf.ThreadPoolExecutor(3) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
