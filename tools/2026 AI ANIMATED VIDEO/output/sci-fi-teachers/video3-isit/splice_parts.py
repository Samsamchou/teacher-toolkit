"""splice_parts.py — 局部重渲染再依「格」接回全片（配音不變時才可用；見 skill 3d-teacher-lesson-video pipeline §8）。
用法：python -I splice_parts.py <舊全片.mp4> <新全片.mp4> <起秒,迄秒> ...
每個範圍先用 run_segments.py（RENDER_FROM／RENDER_UNTIL）渲染成 renders/part-<起>.mp4，再把舊片對應的格換掉；聲音直接沿用舊片。
"""
import sys, os, subprocess, pathlib
HERE = pathlib.Path(__file__).resolve().parent; FPS = 30
old, new = sys.argv[1], sys.argv[2]
rng = [tuple(float(x) for x in a.split(',')) for a in sys.argv[3:]]
parts = []
for a, b in rng:
    fa, fb = round(a * FPS), round(b * FPS); a, b = fa / FPS, fb / FPS
    out = HERE / 'renders' / f'part-{fa}.mp4'
    wav = HERE / 'renders' / f'part-{fa}.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-to', f'{b}', '-i', str(HERE / 'voice_v1.wav'), str(wav)], check=True)
    env = dict(os.environ, RENDER_FROM=f'{a}', RENDER_UNTIL=f'{b}')
    subprocess.run([sys.executable, '-I', str(HERE.parent / 'pilot-nova/run_segments.py'), '--jobs', '4', '--renderer', str(HERE / 'render_v1.py'),
                    '--audio', str(wav), '--out', str(out)], env=env, check=True)
    parts.append((fa, fb, out)); print('part', fa, fb, flush=True)
# 依格接回
inputs = ['-i', old]; fc = []; labels = []; cur = 0
for k, (fa, fb, out) in enumerate(parts):
    inputs += ['-i', str(out)]
    fc.append(f'[0:v]trim=start_frame={cur}:end_frame={fa},setpts=PTS-STARTPTS[o{k}]'); labels.append(f'[o{k}]')
    fc.append(f'[{k + 1}:v]trim=start_frame=0:end_frame={fb - fa},setpts=PTS-STARTPTS[p{k}]'); labels.append(f'[p{k}]')
    cur = fb
fc.append(f'[0:v]trim=start_frame={cur},setpts=PTS-STARTPTS[tail]'); labels.append('[tail]')
fc.append(''.join(labels) + f'concat=n={len(labels)}:v=1:a=0[v]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[v]', '-map', '0:a',
                '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', new], check=True)
print('done', new)
