"""compose9.py — 把桌上微縮渲染圖（每 2 格一張）＋2D 疊圖（cards9）＋聲音（part9.wav）合成 MP4。
用法：python -I compose9.py <輸出.mp4> <SID>=<圖資料夾> [<SID>=<圖資料夾> ...]
  圖資料夾裡是 f0000.png、f0002.png…（light 是 960×540，會放大到 1080p）。
"""
import sys, json, pathlib, subprocess
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cards9

HERE = pathlib.Path(__file__).resolve().parent
TM = json.loads((HERE / 'tabletop' / 'src' / 'timing.json').read_text(encoding='utf-8'))
FPS = 24


def main():
    out = pathlib.Path(sys.argv[1]); jobs = [a.split('=', 1) for a in sys.argv[2:]]
    t_start = TM[jobs[0][0]]['t0']; total = sum(TM[s]['dur'] for s, _ in jobs)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1920x1080', '-r', str(FPS), '-i', '-',
                           '-ss', f'{t_start:.3f}', '-t', f'{total:.3f}', '-i', str(HERE / 'part9.wav'),
                           '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                           '-shortest', str(out)], stdin=subprocess.PIPE)
    for sid, d in jobs:
        seg = TM[sid]; d = pathlib.Path(d); n = round(seg['dur'] * FPS); last = None
        for fr in range(n):
            p = d / f'f{fr - fr % 2:04d}.png'
            if p.exists(): last = Image.open(p).convert('RGBA').resize((1920, 1080), Image.LANCZOS)
            im = last.copy() if last is not None else Image.new('RGBA', (1920, 1080), (0, 0, 0, 255))
            if 'walk' in seg: im.alpha_composite(cards9.overlay(seg, fr / FPS))
            ff.stdin.write(im.convert('RGB').tobytes())
    ff.stdin.close(); ff.wait(); print('done', out, round(total, 2))


main()
