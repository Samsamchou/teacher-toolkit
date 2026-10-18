"""qa_full.py — 全曲 2D 成品檢查：完整解碼、規格、原曲 10 窗對齊（零偏移相關＋最佳偏移）、兩版音軌一致、SHA-256、全片縮圖。
輸出 qa/final-verification-2d-v1.json 與 qa/full-contact-2d-v1.jpg。只用標準函式庫＋ffmpeg。
"""
import array, hashlib, json, math, pathlib, subprocess

here = pathlib.Path(__file__).resolve().parent; root = here.parent; rd = root / 'renders'
song = root.parent / 'sources' / 'How Do You Go.mp3'
files = {k: rd / f'How-Do-You-Go-2D-v1-{k}.mp4' for k in ('English', 'Listening')}
SR = 8000
def pcm(src, t0, d):
    b = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(d), '-i', str(src), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'])
    return array.array('h', b)
def corr(a, b, lag):
    n = min(len(a), len(b)) - 2 * 400; s = sa = sb = 0.0
    for i in range(400, 400 + n):
        x, y = a[i], b[i + lag]; s += x * y; sa += x * x; sb += y * y
    return s / math.sqrt(sa * sb + 1e-9)
rep = {}
for k, f in files.items():
    r = {'bytes': f.stat().st_size, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()}
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', str(f)]))
    r['probe'] = pr
    dec = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-f', 'null', '-'], capture_output=True, text=True)
    r['full_decode_errors'] = dec.stderr.strip()[:500]
    rep[k] = r
# 原曲對齊（English 版；10 窗，±50 ms 搜尋，步進 1 ms）/ audio alignment vs the source song
win = []
for t0 in [2, 20, 38, 56, 74, 92, 110, 128, 146, 164]:
    a = pcm(song, t0, 1.2); b = pcm(files['English'], t0, 1.2)
    z = corr(a, b, 0); best = max(((corr(a, b, L), L) for L in range(-400, 401, 8)), key=lambda x: x[0])
    win.append({'t': t0, 'corr_zero_lag': round(z, 4), 'best_lag_ms': best[1] * 1000 / SR, 'best_corr': round(best[0], 4)})
rep['audio_alignment'] = win
ae = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(files['English']), '-map', '0:a', '-f', 'md5', '-'])
al = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(files['Listening']), '-map', '0:a', '-f', 'md5', '-'])
rep['audio_identical_between_editions'] = ae == al
(root / 'qa' / 'final-verification-2d-v1.json').write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding='utf-8')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(files['English']), '-vf', 'fps=1/7.2,scale=384:-1,tile=6x4', '-frames:v', '1', str(root / 'qa' / 'full-contact-2d-v1.jpg')], check=True)
for k in files: print(k, rep[k]['bytes'], rep[k]['sha256'][:12], 'decode errors:', repr(rep[k]['full_decode_errors']))
print('alignment', [(w['t'], w['corr_zero_lag'], w['best_lag_ms']) for w in win])
print('audio identical', rep['audio_identical_between_editions'])
