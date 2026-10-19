"""download_audio.py — 依 download-list.json 下載維基共享資源音檔到 raw/，寫 sources.json（網址、說明頁、作者、授權、SHA-256）。
已存在的檔案略過；每次請求間隔 1.5 秒，避免 429。用法：python -I download_audio.py
"""
import json, time, hashlib, urllib.request, pathlib
HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / 'raw'; RAW.mkdir(exist_ok=True)
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
rows = json.loads((HERE / 'download-list.json').read_text(encoding='utf-8'))
src = []; seen = {}
for r in rows:
    name = r['file'].replace(' ', '_')
    if name.lower() in seen and seen[name.lower()] != name: name = name[:-4] + '_upper.ogg'   # Windows 不分大小寫（En-us-a 與 En-us-A）
    seen[name.lower()] = name
    f = RAW / name
    if not f.exists():
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(r['url'], headers=UA), timeout=60).read(); break
            except Exception as e:
                print('retry', r['file'], e); time.sleep(60 * (attempt + 1))
        else:
            print('FAIL', r['file']); continue
        f.write_bytes(data); time.sleep(12)
    b = f.read_bytes(); ok = len(b) == r['bytes']
    src.append({'file': f.name, 'tag': r['tag'], 'ipa': r.get('ipa'), 'example': r.get('example'), 'url': r['url'], 'page': r['page'],
                'license': r['license'], 'artist': r['artist'], 'bytes': len(b), 'size_matches_commons': ok, 'sha256': hashlib.sha256(b).hexdigest()})
    print('ok' if ok else 'SIZE?', f.name)
(HERE / 'sources.json').write_text(json.dumps(src, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(src), 'files')
