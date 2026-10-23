# 單段 QA：完整解碼、規格、原配音相關係數、亮度曲線（對首幀，<70% 判不合格）、全畫面與嘴型抽格。
# 用法：uv run --no-project --with pillow --with numpy python -X utf8 scripts/qa_clip.py C01 1
# 讀 specs/<clip>/clip.mp4（colab_h3.py batch 下載位置），把該 take 封存到 takes/<clip>_c<take>.mp4，證據寫 qa/<clip>_c<take>/。
import json, subprocess, hashlib, shutil, sys
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageStat

HERE = Path(__file__).resolve().parents[1]
clip, take = sys.argv[1], int(sys.argv[2])
BOXES = json.loads((HERE / 'scripts' / 'face_boxes.json').read_text(encoding='utf-8'))[clip]   # {name: [x0,y0,x1,y1]} on 1536x864
spec_dir = HERE / 'specs' / clip
spec = json.loads((spec_dir / 'spec.json').read_text(encoding='utf-8'))
src_video = spec_dir / 'clip.mp4'
takes = HERE / 'takes'; takes.mkdir(exist_ok=True)
V = takes / f'{clip}_c{take}.mp4'
if not V.exists():
    shutil.copy2(src_video, V)
    for extra in ('meta.json', 'shot.json', 'prompt.txt'):
        if (spec_dir / extra).exists():
            shutil.copy2(spec_dir / extra, takes / f'{clip}_c{take}_{extra}')
Q = HERE / 'qa' / f'{clip}_c{take}'; Q.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
guide = (spec_dir / spec['audio']['fixed']['file']).resolve()
first = (spec_dir / spec['first_frame']).resolve()
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)


def run(args, **kw):
    p = subprocess.run([str(a) for a in args], capture_output=True, **kw)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', 'replace')[-2000:])
    return p


run(['ffmpeg', '-v', 'error', '-i', V, '-f', 'null', '-'])
probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', V]).stdout)
vs = next(s for s in probe['streams'] if s['codec_type'] == 'video')
W, H = int(vs['width']), int(vs['height'])
raw = run(['ffmpeg', '-v', 'error', '-i', V, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
n = len(frames)
luma = lambda a: float((0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]).mean())
ref = np.asarray(Image.open(first).convert('RGB').resize((W, H)))
ref_l = luma(ref)
trace = [{'frame': i, 'sec': round(i / 24, 3), 'luma': round(luma(f), 1), 'ratio_to_first_guide': round(luma(f) / ref_l, 3)} for i, f in enumerate(frames)]
worst = min(trace, key=lambda t: t['ratio_to_first_guide'])
bright_pass = worst['ratio_to_first_guide'] >= 0.70

# 原配音比對（零延遲相關係數）
def pcm(p):
    return np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', p, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']).stdout, np.float32)
a, b = pcm(V), pcm(guide); m = min(len(a), len(b))
corr = float(np.corrcoef(a[:m], b[:m])[0, 1])

# 全畫面抽格（每 0.25 秒）
def contact(idxs, path, cols=3, tw=512):
    th = tw * H // W; rows = (len(idxs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, rows * (th + 24)), '#e9eef4'); d = ImageDraw.Draw(sheet)
    for j, i in enumerate(idxs):
        im = Image.fromarray(frames[i]).resize((tw, th)); x, y = (j % cols) * tw, (j // cols) * (th + 24)
        sheet.paste(im, (x, y + 24)); d.text((x + 6, y + 2), f'{clip} t={i/24:.2f}s  luma {trace[i]["ratio_to_first_guide"]:.0%}', fill='black', font=font)
    sheet.save(path, quality=90)
whole = list(range(0, n, 6))
for k in range(0, len(whole), 12):
    contact(whole[k:k + 12], Q / f'whole-contact-{k // 12 + 1:02d}.jpg')

# 嘴型抽格（每 2 幀＝12fps）
names = list(BOXES); tiles = []
for i in range(0, n, 2):
    im = Image.fromarray(frames[i]); tile = Image.new('RGB', (200 * len(names), 215), '#e9eef4'); d = ImageDraw.Draw(tile)
    d.text((6, 3), f'{i/24:.3f}s f={i}  ' + ' | '.join(names), fill='black', font=font)
    for c, nm in enumerate(names):
        cr = im.crop(tuple(BOXES[nm])); cr.thumbnail((198, 182)); tile.paste(cr, (200 * c, 215 - cr.height))
    tiles.append(tile)
per = 24; cols = 4
for s in range(0, len(tiles), per):
    group = tiles[s:s + per]; tw = group[0].width
    sheet = Image.new('RGB', (tw * cols, 215 * ((len(group) + cols - 1) // cols)), '#e9eef4')
    for j, t in enumerate(group):
        sheet.paste(t, ((j % cols) * tw, (j // cols) * 215))
    sheet.save(Q / f'mouth-contact-{s // per + 1:02d}.jpg', quality=92)

# 光線對照：首幀、最暗、末幀
comp = Image.new('RGB', (1536, 320), '#e9eef4'); d = ImageDraw.Draw(comp); f24 = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
for j, (i, label) in enumerate([(0, 'first frame'), (worst['frame'], 'darkest frame'), (n - 1, 'last frame')]):
    im = Image.fromarray(frames[i]); im.thumbnail((512, 288)); comp.paste(im, (512 * j, 32))
    d.text((512 * j + 8, 4), f'{i/24:.2f}s {label} ({trace[i]["ratio_to_first_guide"]:.0%})', fill='black', font=f24)
comp.save(Q / 'lighting-comparison.jpg', quality=93)

# 亮度曲線圖
g = Image.new('RGB', (960, 260), 'white'); d = ImageDraw.Draw(g)
y = lambda r: 230 - int(min(r, 1.3) / 1.3 * 200)
d.line([(40, y(0.7)), (950, y(0.7))], fill='#d33', width=1); d.text((44, y(0.7) - 18), '70% threshold', fill='#d33', font=font)
d.line([(40, y(1.0)), (950, y(1.0))], fill='#999', width=1)
pts = [(40 + int(t['frame'] / max(n - 1, 1) * 910), y(t['ratio_to_first_guide'])) for t in trace]
d.line(pts, fill='#1565c0', width=3); d.text((44, 236), '0 s', fill='black', font=font); d.text((900, 236), f'{n/24:.0f} s', fill='black', font=font)
g.save(Q / 'brightness-curve.png')

result = {
    'clip': clip, 'take': take, 'platform': 'Google Colab G4 (shanshiba colab_h3.py batch)', 'checked_at': datetime.now(timezone.utc).isoformat(),
    'video': str(V.relative_to(HERE)).replace('\\', '/'), 'video_sha256': sha(V), 'seed': spec['seed'],
    'spec_sha256': sha(spec_dir / 'spec.json'), 'guide': str(guide), 'guide_sha256': sha(guide), 'first_frame_sha256': sha(first),
    'full_decode_pass': True, 'width': W, 'height': H, 'frames': n, 'r_frame_rate': vs.get('r_frame_rate'),
    'AAC_to_guide_zero_lag_correlation': round(corr, 6), 'source_audio_pass': corr > 0.99,
    'brightness_min_ratio': worst['ratio_to_first_guide'], 'brightness_min_at_sec': worst['sec'], 'brightness_pass': bright_pass,
    'brightness_threshold': 0.70, 'precise_phoneme_lip_sync_measured': False, 'teacher_acceptance': 'PENDING',
}
(Q / 'brightness-trace.json').write_text(json.dumps(trace, indent=1), encoding='utf-8')
(Q / 'auto-qa.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
