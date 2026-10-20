"""long_u_search.py — 在維基共享資源找 long u（/uː/、/juː/）的美式單字錄音，存 long-u/candidates.json。"""
import json, urllib.request, urllib.parse, pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = pathlib.Path(__file__).resolve().parent
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
WORDS = ['true', 'blue', 'clue', 'glue', 'suit', 'fruit', 'juice', 'flute', 'rule', 'June', 'tube', 'cube', 'use', 'mule', 'tune', 'duke', 'cute', 'huge']
titles = [f'File:En-us-{w}.ogg' for w in WORDS]
q = {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'titles': '|'.join(titles)}
d = json.loads(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q), headers=UA), timeout=60).read())
out = []
for p in d['query']['pages'].values():
    if 'imageinfo' not in p: print('missing', p['title']); continue
    ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
    strip = lambda s: re.sub('<[^>]+>', '', s or '').strip()
    out.append({'file': p['title'][5:], 'url': ii['url'], 'page': ii['descriptionurl'], 'bytes': ii['size'],
                'license': strip(m.get('LicenseShortName', {}).get('value')), 'artist': strip(m.get('Artist', {}).get('value'))})
    print('found', out[-1]['file'], out[-1]['license'], out[-1]['artist'])
(HERE / 'long-u' / 'candidates.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
