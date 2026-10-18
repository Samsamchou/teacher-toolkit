"""render_all.py — 全曲 2D 動畫：平行渲染各場景（字幕版＋聽力版），再依全曲影格串接並配上完整原曲。
用法:
  python -I render_all.py render [scene ...] [--jobs 6]     # 不給場景名就渲染全部
  python -I render_all.py assemble                           # 串接成 renders/How-Do-You-Go-2D-v1-English.mp4 與 -Listening.mp4
場景表 SCENES 的起訖必須首尾相接、涵蓋 0–172.133 s；render.py 以全曲影格號計算，串接後逐格對齊原曲。
"""
import subprocess, sys, pathlib, json
from concurrent.futures import ThreadPoolExecutor

here = pathlib.Path(__file__).resolve().parent; root = here.parent; song = root.parent / 'sources' / 'How Do You Go.mp3'
FPS = 30
SCENES = ['s00-intro', 's01-taiwan-car', 's02-singapore-metro', 's03-japan-foot', 's04-chorus1', 's05-korea-bus',
          's06-chorus2', 's07-uk-train', 's08-usa-scooter', 's09-chant-dance', 's10-finale']
TOTAL = round(172.133333 * FPS)   # 5164 格，與 V13／V15 30 fps 版相同

def render(scene, nosub):
    cmd = [sys.executable, '-I', str(here / 'render.py'), scene] + (['--nosub'] if nosub else [])
    r = subprocess.run(cmd, capture_output=True, text=True)
    return scene, nosub, r.returncode, (r.stdout + r.stderr).strip().splitlines()[-1:] if (r.stdout + r.stderr).strip() else []

def frames(p):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', str(p)]).decode().strip().strip(','))

if sys.argv[1] == 'render':
    args = sys.argv[2:]; jobs = 6
    if '--jobs' in args: i = args.index('--jobs'); jobs = int(args[i + 1]); del args[i:i + 2]
    todo = [(s, ns) for s in (args or SCENES) for ns in (False, True)]
    with ThreadPoolExecutor(jobs) as ex:
        for scene, ns, rc, tail in ex.map(lambda x: render(*x), todo): print(('OK ' if rc == 0 else 'FAIL ') + scene + (' nosub' if ns else ''), tail, flush=True)
elif sys.argv[1] == 'assemble':
    rd = root / 'renders'; report = {'fps': FPS, 'expected_frames': TOTAL, 'scenes': []}
    for ns, label in ((False, 'English'), (True, 'Listening')):
        sfx = '-nosub' if ns else ''; parts = [rd / f'{s}-silent{sfx}.mp4' for s in SCENES]
        missing = [p.name for p in parts if not p.exists()]
        if missing: sys.exit(f'缺少場景檔 / missing: {missing}')
        lst = rd / f'concat{sfx}.txt'; lst.write_text(''.join(f"file '{p.name}'\n" for p in parts), encoding='utf-8')
        out = rd / f'How-Do-You-Go-2D-v1-{label}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(song),
                        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'apad', '-t', f'{TOTAL / FPS:.6f}', str(out)], check=True)
        lst.unlink()
        if not ns: report['scenes'] = [{'scene': p.stem, 'frames': frames(p)} for p in parts]
        report[label] = {'file': out.name, 'frames': frames(out), 'duration': float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)]))}
        print(label, report[label])
    report['scene_frames_sum'] = sum(s['frames'] for s in report['scenes'])
    (root / 'qa' / 'assemble-report.json').write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding='utf-8')
    print('sum of scene frames', report['scene_frames_sum'], 'expected', TOTAL)
