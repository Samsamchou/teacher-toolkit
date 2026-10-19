"""render.py — Playwright 逐格截圖 renderFrame(T)，ffmpeg 合成。影格以全片為準（第 g 格 = g/fps 秒）。
用法:
  python -I render.py --still 12.3 [--nosub]           單格 PNG
  python -I render.py --t0 0 --t1 50.3 --jobs 6 [--nosub] --out ../renders/pilot.mp4
  （不給 --t0/--t1 = 全片）
"""
import argparse, subprocess, sys, pathlib, json, math
from concurrent.futures import ProcessPoolExecutor
here = pathlib.Path(__file__).resolve().parent
ROOT = here.parent
FPS = 30

def browser_page(p, nosub):
    b = p.chromium.launch(args=['--use-angle=d3d11'] if sys.platform == 'win32' else [])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((here / 'player.html').as_uri() + ('?nosub=1' if nosub else ''))
    pg.wait_for_function('window.READY===true', timeout=120000)
    return b, pg

def chunk(args):
    f0, f1, nosub, out = args
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, pg = browser_page(p, nosub)
        ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-i', '-', '-c:v', 'libx264',
                               '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-r', str(FPS), out], stdin=subprocess.PIPE)
        for g in range(f0, f1):
            pg.evaluate(f'renderFrame({g / FPS})')
            ff.stdin.write(pg.locator('#cv').screenshot(type='jpeg', quality=95))
        ff.stdin.close(); ff.wait(); b.close()
    return out

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--still', type=float); ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float)
    ap.add_argument('--jobs', type=int, default=6); ap.add_argument('--nosub', action='store_true'); ap.add_argument('--out')
    ap.add_argument('--audio', default=str(ROOT / 'narration' / 'mix.wav'))
    a = ap.parse_args()
    tl = json.loads((ROOT / 'narration' / 'timeline.json').read_text(encoding='utf-8'))
    (ROOT / 'renders').mkdir(exist_ok=True)
    if a.still is not None:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b, pg = browser_page(p, a.nosub)
            f = ROOT / 'renders' / f'still-{a.still:07.2f}{"-nosub" if a.nosub else ""}.png'
            pg.evaluate(f'renderFrame({a.still})'); pg.locator('#cv').screenshot(path=str(f)); b.close(); print(f)
        sys.exit()
    t1 = a.t1 if a.t1 is not None else tl['dur']
    F0, F1 = round(a.t0 * FPS), round(t1 * FPS)
    n = max(1, a.jobs); step = math.ceil((F1 - F0) / n)
    tmp = ROOT / 'renders' / 'chunks'; tmp.mkdir(exist_ok=True)
    tasks = [(f, min(f + step, F1), a.nosub, str(tmp / f'c{f:06d}{"-nosub" if a.nosub else ""}.mp4')) for f in range(F0, F1, step)]
    with ProcessPoolExecutor(len(tasks)) as ex: outs = list(ex.map(chunk, tasks))
    lst = tmp / 'list.txt'; lst.write_text(''.join(f"file '{pathlib.Path(o).as_posix()}'\n" for o in outs), encoding='utf-8')
    silent = tmp / f'silent{"-nosub" if a.nosub else ""}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    out = a.out or str(ROOT / 'renders' / f'jiji{"-nosub" if a.nosub else ""}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-ss', str(F0 / FPS), '-t', str((F1 - F0) / FPS), '-i', a.audio,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', out], check=True)
    print(out, F1 - F0, 'frames')
