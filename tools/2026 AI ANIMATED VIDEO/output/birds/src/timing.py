"""timing.py — 〈Birds〉55 句句首（兩次 Whisper 逐字時間人工對出），輸出 data/lines.json，
並在每句 40% 處從原 MV 抽一格（frames/Lxx.jpg），做成 frames/contact-*.jpg。
check：asr＝逐字時間對上；est＝辨識錯或沒聽到，依段落位置推估（需聽校）。
用法: python -I src/timing.py
"""
import json, pathlib, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
root = pathlib.Path(__file__).resolve().parents[1]
MV = str(root.parents[1] / '資料' / 'Imagine Dragons - Birds (Animated Video).mp4')
lyr = [l for l in (root / 'sources' / 'lyrics.txt').read_text(encoding='utf-8').splitlines() if l.strip()]
V1, P1, C1, V2, P2, C2, BR, C3 = 'Verse 1', 'Pre-Chorus 1', 'Chorus 1', 'Verse 2', 'Pre-Chorus 2', 'Chorus 2', 'Bridge', 'Final Chorus'
T = [
 (17.36,V1,'asr'),(20.86,V1,'asr'),(23.24,V1,'asr'),(24.86,V1,'asr'),(28.86,V1,'asr'),(31.22,V1,'asr'),
 (32.50,P1,'asr'),(34.40,P1,'asr'),(36.60,P1,'asr'),(40.40,P1,'asr'),(42.60,P1,'est'),(44.40,P1,'asr'),(48.12,P1,'asr'),
 (50.76,C1,'asr'),(53.10,C1,'asr'),(56.50,C1,'asr'),(61.13,C1,'asr'),
 (66.00,V2,'asr'),(69.30,V2,'asr'),(71.22,V2,'asr'),(73.30,V2,'asr'),(77.30,V2,'asr'),(79.28,V2,'asr'),
 (80.50,P2,'asr'),(82.50,P2,'asr'),(84.50,P2,'asr'),(88.40,P2,'asr'),(90.60,P2,'est'),(92.60,P2,'asr'),(96.12,P2,'asr'),
 (98.40,C2,'est'),(100.58,C2,'asr'),(104.46,C2,'est'),(108.52,C2,'asr'),(111.96,C2,'asr'),(117.14,C2,'asr'),(120.70,C2,'asr'),(124.82,C2,'est'),
 (128.64,BR,'asr'),(137.66,BR,'asr'),(145.40,BR,'asr'),(153.20,BR,'asr'),
 (169.04,C3,'asr'),(171.12,C3,'asr'),(174.70,C3,'est'),(179.50,C3,'est'),(182.46,C3,'asr'),(187.00,C3,'est'),(190.46,C3,'est'),
 (195.00,C3,'est'),(199.34,C3,'asr'),(203.02,C3,'asr'),(204.38,C3,'asr'),(211.02,C3,'asr'),(212.16,C3,'asr'),
]
assert len(T) == len(lyr) == 55, (len(T), len(lyr))
ends = [T[i + 1][0] for i in range(54)] + [219.5]
ends[16], ends[41] = 64.6, 159.5   # 副歌一後、Bridge 後的間奏
lines = [{'n': i + 1, 'start': s, 'end': round(ends[i], 2), 'section': sec, 'check': c, 'text': lyr[i]} for i, (s, sec, c) in enumerate(T)]
extra = [('intro-a', 3), ('intro-b', 9), ('intro-c', 14), ('inst-a', 161), ('inst-b', 165), ('outro-a', 221)]
(root / 'data' / 'lines.json').write_text(json.dumps({'lines': lines, 'extra': extra}, ensure_ascii=False, indent=1), encoding='utf-8')
fr = root / 'frames'; fr.mkdir(exist_ok=True)
shots = [(f"L{l['n']:02d}", l['start'] + 0.4 * (l['end'] - l['start'])) for l in lines] + extra
for name, t in shots:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', MV, '-frames:v', '1', '-vf', 'scale=480:-1', str(fr / f'{name}.jpg')], check=True)
from PIL import Image, ImageDraw, ImageFont
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
for k in range(0, len(shots), 20):
    sheet = Image.new('RGB', (480 * 5, 270 * 4), 'black')
    for j, (n, t) in enumerate(shots[k:k + 20]):
        im = Image.open(fr / f'{n}.jpg').convert('RGB'); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 160, 30], fill='black'); d.text((6, 3), f'{n} {t:.1f}s', fill='yellow', font=font)
        sheet.paste(im, ((j % 5) * 480, (j // 5) * 270))
    sheet.save(fr / f'contact-{k // 20 + 1}.jpg', quality=85)
print('ok', len(lines), 'lines,', len(shots), 'frames')
