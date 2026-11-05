"""run_segments.py — 把渲染切成 N 段同時跑（本機 Windows 或 RunPod Linux 都能用），完成後串接並加上聲音。
用法：python run_segments.py --jobs 16 [--out renders/pilot-nova-v2.1-pod.mp4] [--renderer render_pilot_v2.py] [--audio voice_v2.wav]
分段檔放在 renders/segs/seg-XX.mp4（只有畫面）；每段記錄起訖格數與耗時到 renders/segs/run.json。
"""
import sys, json, time, subprocess, pathlib, argparse

HERE = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--jobs', type=int, default=4)
ap.add_argument('--renderer', default='render_pilot_v2.py')
ap.add_argument('--audio', default='voice_v2.wav')
ap.add_argument('--out', default='renders/pilot-nova-v2.1-segmented.mp4')
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--segdir', default=None, help='分段檔目錄（預設 pilot-nova/renders/segs；兩支影片同時渲染時一定要各用各的，2026-11-05 影片 6／7 互相覆蓋過）')
ap.add_argument('--assemble-only', action='store_true', help='不重新渲染，只把 renders/segs 已有的分段串接加聲音')
a = ap.parse_args()

py = sys.executable
renderer = str(HERE / a.renderer)
n = int(subprocess.run([py, renderer, '--frames'], capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1])
segdir = pathlib.Path(a.segdir) if a.segdir else HERE / 'renders' / 'segs'; segdir.mkdir(parents=True, exist_ok=True)
step = -(-n // a.jobs)
plan = [(k, k * step, min(n, (k + 1) * step)) for k in range(a.jobs) if k * step < n]
print(f'frames {n}, segments {len(plan)}, ~{step} frames each', flush=True)

t0 = time.time()
procs = []
for k, g0, g1 in plan:
    out = segdir / f'seg-{k:02d}.mp4'
    if a.assemble_only:
        procs.append((k, g0, g1, out, None)); continue
    log = open(segdir / f'seg-{k:02d}.log', 'w', encoding='utf-8')
    procs.append((k, g0, g1, out, subprocess.Popen([py, renderer, '--segment', str(g0), str(g1), str(out)], stdout=log, stderr=subprocess.STDOUT)))
failed = [k for k, *_, p in procs if p is not None and p.wait() != 0]
render_sec = round(time.time() - t0, 1)
if failed: sys.exit(f'segments failed: {failed} (see renders/segs/seg-XX.log)')

# 串接（不重新壓縮畫面）＋加聲音
lst = segdir / 'list.txt'
lst.write_text(''.join(f"file '{o.name}'\n" for _, _, _, o, _ in procs), encoding='utf-8')
dst = HERE / a.out
# 不用 -shortest：聲音比畫面短幾毫秒時，-shortest 會把最後幾格切掉。改成把聲音補靜音到和畫面一樣長（n 格 ÷ fps）。
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-i', str(HERE / a.audio),
                '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'apad', '-c:a', 'aac', '-b:a', '192k',
                '-t', f'{n / a.fps:.6f}', str(dst)], check=True)
json.dump({'frames': n, 'jobs': a.jobs, 'segments': [[k, g0, g1] for k, g0, g1, *_ in procs], 'render_seconds': render_sec,
           'total_seconds': round(time.time() - t0, 1), 'output': str(dst)}, open(segdir / 'run.json', 'w', encoding='utf-8'), indent=1)
print('done', dst, 'render', render_sec, 's', flush=True)
