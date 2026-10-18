"""qa_units.py <video.mp4> [--upto N] — 每個句意在它說到一半時，從成片抽一格，拼成 qa/units-contact-<name>.jpg，並檢查影片規格與音訊。"""
import sys, json, subprocess, pathlib
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parent.parent
v = pathlib.Path(sys.argv[1]); upto = int(sys.argv[sys.argv.index('--upto') + 1]) if '--upto' in sys.argv else 999
tl = json.loads((ROOT / 'narration' / 'timeline.json').read_text(encoding='utf-8'))
info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(v)], capture_output=True, text=True, encoding='utf-8').stdout)
vs = [s for s in info['streams'] if s['codec_type'] == 'video'][0]; aus = [s for s in info['streams'] if s['codec_type'] == 'audio']
print('video', vs['width'], 'x', vs['height'], vs['r_frame_rate'], 'frames', vs.get('nb_frames'), 'dur', info['format']['duration'], 'audio streams', len(aus))
subprocess.run(['ffmpeg', '-v', 'error', '-i', str(v), '-f', 'null', '-'], check=True); print('full decode ok')
units = [u for u in tl['units'] if u['n'] <= upto and (u['t0'] + u['t1']) / 2 < float(info['format']['duration'])]
out = ROOT / 'qa' / ('units-' + v.stem); out.mkdir(parents=True, exist_ok=True)
tw, th, cols = 480, 270, 4; rows = (len(units) + cols - 1) // cols
font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 18)
sheet = Image.new('RGB', (cols * tw, rows * (th + 52)), 'white'); d = ImageDraw.Draw(sheet)
for k, u in enumerate(units):
    t = (u['t0'] + u['t1']) / 2; f = out / f"u{u['n']:02d}.jpg"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', str(v), '-frames:v', '1', '-q:v', '3', str(f)], check=True)
    x, y = (k % cols) * tw, (k // cols) * (th + 52)
    sheet.paste(Image.open(f).resize((tw, th)), (x, y + 52))
    d.text((x + 4, y + 2), f"#{u['n']} {t:.1f}s {u['name']}", fill='black', font=font); d.text((x + 4, y + 26), u['text'][:24], fill='#333', font=font)
p = ROOT / 'qa' / f'units-contact-{v.stem}.jpg'; sheet.save(p, quality=88); print(p, len(units), 'units')
