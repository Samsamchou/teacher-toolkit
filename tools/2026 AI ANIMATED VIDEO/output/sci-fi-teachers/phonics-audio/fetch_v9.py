"""fetch_v9.py — 影片 9：從 Wikimedia Commons 下載 ar 的真人發音（En-us-are.ogg，are＝/ɑr/），處理成 processed/En-us-are.wav，
並把出處加進 sources.json（片尾要列作者與授權）。用法：python -I fetch_v9.py
"""
import json, hashlib, urllib.request, urllib.error, urllib.parse, pathlib, re, subprocess
import numpy as np, soundfile as sf
HERE = pathlib.Path(__file__).resolve().parent
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
SR = 48000
import time


def get(url):
    for k in range(5):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == 4: raise
            print('429，等', 60 * (k + 1), '秒', flush=True); time.sleep(60 * (k + 1))
for name, tag, ipa, ex in [('En-us-are.ogg', 'ar', 'ɑr', 'are')]:
    q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + name, 'prop': 'imageinfo',
         'iiprop': 'url|size|extmetadata', 'format': 'json'})
    info = list(json.loads(get(q))['query']['pages'].values())[0]['imageinfo'][0]
    md = info['extmetadata']; artist = re.sub('<[^>]+>', '', md.get('Artist', {}).get('value', '')).strip(); lic = md.get('LicenseShortName', {}).get('value', '')
    raw = HERE / 'raw' / name
    if not raw.exists(): time.sleep(5); raw.write_bytes(get(info['url']))
    b = raw.read_bytes()
    d, sr = sf.read(str(raw), dtype='float32', always_2d=True); d = d.mean(1)
    a = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', str(SR), '-f', 'f32le', '-'],
                      input=d.tobytes(), capture_output=True, check=True).stdout, np.float32).copy()
    env = np.convolve(np.abs(a), np.ones(480) / 480, 'same'); idx = np.where(env > max(env.max() * .008, 1e-4))[0]
    a = a[max(0, idx[0] - int(.04 * SR)):min(len(a), idx[-1] + int(.12 * SR))]; f = int(.01 * SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    a = a / max(np.abs(a).max(), 1e-6) * 10 ** (-3 / 20)
    out = HERE / 'processed' / (name[:-4] + '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', str(out)], input=(np.clip(a, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    src = json.loads((HERE / 'sources.json').read_text(encoding='utf-8'))
    if not any(s['file'] == name for s in src):
        src.append({'file': name, 'tag': tag, 'ipa': ipa, 'example': ex, 'url': info['url'], 'page': info['descriptionurl'], 'license': lic,
                    'artist': artist, 'bytes': len(b), 'size_matches_commons': len(b) == info['size'], 'sha256': hashlib.sha256(b).hexdigest(), 'video': 9})
        (HERE / 'sources.json').write_text(json.dumps(src, ensure_ascii=False, indent=1), encoding='utf-8')
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel('small.en', device='cpu', compute_type='int8').transcribe(str(out))
    print(name, lic, artist, round(len(a) / SR, 2), 's; whisper:', ' '.join(s.text for s in segs))
