"""line_sheet.py — 逐句「片語 × 畫面」對照抽格表：每句 3 格（句子前段、中段、後段），每段慢動作另一列。
說明文字取自 script/逐句片語畫面_v2.md。
python -I line_sheet.py s01:../renders/s01-v3.mp4 s02:../renders/s02-v2.mp4 --out ../renders/review-s01-s02.jpg"""
import argparse, json, pathlib, re, subprocess, io
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
FONT = 'C:/Windows/Fonts/msjhbd.ttc'
ap = argparse.ArgumentParser(); ap.add_argument('items', nargs='+'); ap.add_argument('--out', required=True); a = ap.parse_args()
man = {m['id']: m for m in json.load(open(ROOT / 'audio' / 'lines' / 'manifest.json', encoding='utf-8'))}
acts = {}
for line in open(ROOT / 'script' / '逐句片語畫面_v2.md', encoding='utf-8'):
    m = re.match(r'\|\s*(\d+)\s*\|[^|]*\|([^|]*)\|', line)
    if m: acts[int(m.group(1))] = m.group(2).strip()

TW, TH = 400, 225
def grab(video, t):
    png = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', f'scale={TW}:{TH}', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGB')

rows = []
for it in a.items:
    name, video = it.split(':', 1)
    tl = json.load(open(ROOT / 'timeline' / f'{name}.json', encoding='utf-8'))
    ev = [('line', c['start'], c) for c in tl['cues']] + [('beat', b['t'], b) for b in tl.get('beats', [])]
    for kind, t0, x in sorted(ev, key=lambda e: e[1]):
        if kind == 'line':
            m = man[x['id']]; d = m['dur']
            rows.append(('line', m, [grab(video, t0 + f * d) for f in (0.2, 0.55, 0.92)]))
        else:
            rows.append(('beat', x, [grab(video, t0 + x['dur'] * 0.55)]))

W = 1260 + 520
heights = [TH + 24 if k == 'line' else TH + 24 for k, _, _ in rows]
img = Image.new('RGB', (W, sum(heights) + 20), '#f6f3ea'); g = ImageDraw.Draw(img)
f1 = ImageFont.truetype(FONT, 24); f2 = ImageFont.truetype(FONT, 18)
def wrap(text, x, y, width, font, fill):
    line = ''
    for ch in text:
        if g.textlength(line + ch, font=font) > width: g.text((x, y), line, font=font, fill=fill); y += 24; line = ch
        else: line += ch
    g.text((x, y), line, font=font, fill=fill); return y + 26
y = 10
for (kind, m, thumbs), hgt in zip(rows, heights):
    for i, th in enumerate(thumbs): img.paste(th, (10 + i * (TW + 10), y))
    tx = 1270
    if kind == 'line':
        g.text((tx, y + 2), f"第 {m['n']} 句　□ 每個片語都有畫面", font=f1, fill='#1f2a5a')
        yy = wrap(m['text'], tx, y + 36, 490, f2, '#333')
        wrap(acts.get(m['n'], ''), tx, yy + 4, 490, f2, '#8a3a1f')
    else:
        g.rectangle((10 + TW + 10, y + 40, 10 + TW * 3 + 20, y + TH - 40), fill='#fff4d6')
        g.text((10 + TW + 40, y + 70), f"慢動作特寫：{m['label']}", font=f1, fill='#a06a00')
        g.text((10 + TW + 40, y + 110), f"{m['dur']} 秒　□ 物件清楚、在畫面中央", font=f2, fill='#8a6a3a')
    g.line((10, y + hgt - 8, W - 10, y + hgt - 8), fill='#d8d0bc', width=2)
    y += hgt
img.save(a.out, quality=86); print(a.out, len(rows), 'rows')
