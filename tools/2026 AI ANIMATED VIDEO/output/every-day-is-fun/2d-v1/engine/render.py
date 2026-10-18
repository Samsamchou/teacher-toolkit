"""render.py — 用 Playwright 逐格截圖 renderFrame(t)，再以 ffmpeg 合成 MP4。
影格以「全曲」為準：場景涵蓋全曲第 round(songStart*fps) 到 round((songStart+dur)*fps)-1 格，
本地 t = 全曲格號/fps − songStart，所以各場景串接後與原曲逐格對齊、不累積誤差。
用法:
  python -I render.py s01-weekend [--fps 30] [--song "../../sources/Every Day Is Fun.mp3"] [--nosub] [--out x.mp4]
  python -I render.py s01-weekend --still 3.5        # 單格 PNG（本地秒）
"""
import argparse, subprocess, sys, pathlib
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('scene'); ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--still', type=float, help='只輸出一張 PNG（本地秒）'); ap.add_argument('--song'); ap.add_argument('--audio', help='額外音軌')
ap.add_argument('--out'); ap.add_argument('--song-vol', type=float, default=0.55); ap.add_argument('--nosub', action='store_true', help='聽力版：不畫字幕')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent
out_dir = here.parent / 'renders'; out_dir.mkdir(exist_ok=True)
suffix = '-nosub' if a.nosub else ''
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11'] if sys.platform == 'win32' else [])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto((here / 'player.html').as_uri() + '?scene=' + a.scene + ('&nosub=1' if a.nosub else ''))
    pg.wait_for_function('window.READY===true')
    dur = pg.evaluate('SCENE.dur'); song0 = pg.evaluate('SCENE.songStart')
    if a.still is not None:
        f = out_dir / f'{a.scene}-still-{a.still:.2f}{suffix}.png'
        pg.evaluate(f'renderFrame({a.still})'); pg.locator('#cv').screenshot(path=str(f)); print(f); b.close(); sys.exit()
    f0, f1 = round(song0 * a.fps), round((song0 + dur) * a.fps)
    silent = out_dir / f'{a.scene}-silent{suffix}.mp4'
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(a.fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-r', str(a.fps), str(silent)], stdin=subprocess.PIPE)
    for g in range(f0, f1):
        pg.evaluate(f'renderFrame({g / a.fps - song0})')
        ff.stdin.write(pg.locator('#cv').screenshot(type='jpeg', quality=95))
    ff.stdin.close(); ff.wait(); b.close()
n = f1 - f0
if not (a.song or a.audio): print(silent, n, 'frames', f0, f1); sys.exit()
final = pathlib.Path(a.out) if a.out else out_dir / f'{a.scene}{suffix}.mp4'
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(silent)]
if a.song: cmd += ['-ss', str(f0 / a.fps), '-t', str(n / a.fps), '-i', a.song]
if a.audio: cmd += ['-i', a.audio]
if a.song and a.audio: cmd += ['-filter_complex', f'[1:a]volume={a.song_vol}[m];[2:a]aformat=channel_layouts=stereo[v];[v][m]amix=inputs=2:duration=first:normalize=0[a]', '-map', '0:v', '-map', '[a]']
else: cmd += ['-map', '0:v', '-map', '1:a']
cmd += ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', str(final)]
subprocess.run(cmd, check=True); print(final, n, 'frames', f0, f1)
