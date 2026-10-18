"""qa_lines.py — 「每句歌詞都有對應動作」的成片檢查：對 52 句，各在該句唱到一半時從英文字幕成片抽一格，
加上句號與歌詞後拼成總表 qa/lines-contact-1.jpg、-2.jpg（每張 26 句，13×2 欄排列較易閱讀）。
同時檢查每句都落在某個場景內，並列出場景交界與句子的關係（句子不應被場景切開）。
用法: python -I qa_lines.py
"""
import json, pathlib, subprocess, re, sys
here = pathlib.Path(__file__).resolve().parent; root = here.parent
sd = (here / 'song-data.js').read_text(encoding='utf-8'); SONG = json.loads(sd[sd.index('{'):sd.rindex('}') + 1])
video = root / 'renders' / 'Every-Day-Is-Fun-2D-v1-English.mp4'
if not video.exists(): sys.exit('先執行 render_all.py assemble')
# 場景邊界（取自各場景檔的 songStart／dur）/ scene boundaries from the scene files
SCENES = re.findall(r"'(s\d\d-[\w-]+)'", re.search(r'SCENES = \[(.*?)\]', (here / 'render_all.py').read_text(encoding='utf-8')).group(1))
bounds = []
for s in SCENES:
    t = (root / 'scenes' / f'{s}.js').read_text(encoding='utf-8')
    dur = float(re.search(r'dur:\s*([\d.]+)', t).group(1)); m = re.search(r'songStart:\s*([\w.]+)', t).group(1)
    st = float(m) if re.fullmatch(r'[\d.]+', m) else float(re.search(rf'const {m}\s*=\s*([\d.]+)', t).group(1))
    bounds.append((s, st, st + dur))
report, tmp = [], root / 'qa' / 'lines'; tmp.mkdir(exist_ok=True)
for n, (a, b, text, toks) in enumerate(SONG['cues'], 1):
    mid = a + (b - a) * .55
    scene = [s for s, s0, s1 in bounds if s0 <= mid < s1]
    split = [s for s, s0, s1 in bounds if a < s0 < b - .3]
    report.append({'n': n, 'time': round(mid, 2), 'text': text, 'scene': scene[0] if scene else None, 'split_by_boundary': split})
    label = f"#{n} {mid:.1f}s".replace(':', '\\:')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{mid:.3f}', '-i', str(video), '-frames:v', '1',
                    '-vf', f"scale=480:-1,drawbox=x=0:y=0:w=150:h=34:color=black@0.7:t=fill,drawtext=text='{label}':x=8:y=7:fontsize=20:fontcolor=white:fontfile='C\\:/Windows/Fonts/arial.ttf'",
                    str(tmp / f'{n:02d}.jpg')], check=True)
for part, start in ((1, 1), (2, 27)):   # 每張 26 句，4 欄 × 7 列（tile 會補空白格）/ 26 lines per sheet
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-start_number', str(start), '-i', str(tmp / '%02d.jpg'), '-frames:v', '26',
                    '-vf', 'tile=4x7', '-frames:v', '1', str(root / 'qa' / f'lines-contact-{part}.jpg')], check=True)
(root / 'qa' / 'lines-check.json').write_text(json.dumps({'scenes': bounds, 'lines': report}, ensure_ascii=False, indent=1), encoding='utf-8')
print('lines', len(report), '| without scene:', [r['n'] for r in report if not r['scene']], '| split by a scene boundary:', [(r['n'], r['split_by_boundary']) for r in report if r['split_by_boundary']])
