"""batch_face2.py — 老師斜臉嘴型 v2 批次：13 個說話姿勢，同時跑 3 個姿勢（每個姿勢 8 張依序生成），完成後各自合成 patches-v2。"""
import subprocess, sys, pathlib, concurrent.futures as cf
HERE = pathlib.Path(__file__).resolve().parent
POSES = [('nova', f'face-nova-{p}-v1') for p in ('P02', 'P03', 'P05', 'P06', 'P07', 'P09')] + \
        [('cosmo', f'face-cosmo-{p}-v1') for p in ('P02', 'P03', 'P05', 'P06', 'P07', 'P10', 'P04')]
def run(tp):
    t, d = tp
    g = subprocess.run([sys.executable, '-I', str(HERE / 'face_set2.py'), 'gen', t, d], capture_output=True, text=True, encoding='utf-8', errors='replace')
    p = subprocess.run([sys.executable, '-I', str(HERE / 'face_set2.py'), 'patch', t, d], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return d, g.stdout.strip().replace('\n', ' | '), (p.stdout.strip().splitlines() or ['?'])[0][:200], p.stderr[-300:]
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(run, POSES): print(*r, sep='\n  ', flush=True)
